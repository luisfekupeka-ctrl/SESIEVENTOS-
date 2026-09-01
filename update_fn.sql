CREATE OR REPLACE FUNCTION public.register_participant(p_event_id uuid, p_student_name text, p_student_surname text, p_student_grade text, p_student_class text, p_participant_type text, p_form_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_student_id UUID;
  v_db_student_grade TEXT;
  v_db_student_gender TEXT;
  v_effective_grade TEXT;
  v_existing_id UUID;
  v_registration_count INTEGER;
  v_max_capacity INTEGER;
  v_event_name TEXT;
  
  v_restrictions JSONB;
  v_category_id UUID;
  v_subcategory_id UUID;
  v_restringir_duplicidade INTEGER;
  v_conflict_event_name TEXT;
  
  v_limitar_vagas_por_ano INTEGER;
  v_vagas_por_ano JSONB;
  v_grade_limit INTEGER;
  v_grade_count INTEGER;
  v_normalized_input_grade TEXT;
  v_base_modality TEXT;
  
  v_limitar_vagas_genero INTEGER;
  v_vagas_masculino INTEGER;
  v_vagas_feminino INTEGER;
  v_user_gender TEXT;
  v_gender_count INTEGER;
  
  v_enable_autocomplete BOOLEAN;
  v_display_mode JSONB;
BEGIN
  -- 0. Verificar Modo Exibição / Contagem Regressiva em system_settings
  BEGIN
    SELECT value::jsonb INTO v_display_mode FROM system_settings WHERE key = 'display_mode';
    IF v_display_mode IS NOT NULL THEN
      IF (v_display_mode->>'enabled')::boolean = true THEN
        RETURN jsonb_build_object('success', false, 'error', 'Inscrições temporariamente bloqueadas (Modo de Exibição Ativo).');
      END IF;
      IF (v_display_mode->>'unlock_target_at') IS NOT NULL AND NOW() < (v_display_mode->>'unlock_target_at')::timestamptz THEN
        RETURN jsonb_build_object('success', false, 'error', 'Inscrições bloqueadas. Aguarde o término da contagem regressiva para liberação.');
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- ignorar erro de parsing de settings se não existir
  END;

  -- Fetch Event details
  SELECT name, max_capacity, registration_count, restrictions, category_id, subcategory_id, restringir_duplicidade, COALESCE(limitar_vagas_por_ano, 0), vagas_por_ano::jsonb, COALESCE(enable_autocomplete, true), COALESCE(limitar_vagas_genero, 0), COALESCE(vagas_masculino, 0), COALESCE(vagas_feminino, 0)
  INTO v_event_name, v_max_capacity, v_registration_count, v_restrictions, v_category_id, v_subcategory_id, v_restringir_duplicidade, v_limitar_vagas_por_ano, v_vagas_por_ano, v_enable_autocomplete, v_limitar_vagas_genero, v_vagas_masculino, v_vagas_feminino
  FROM events WHERE id = p_event_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento não encontrado.');
  END IF;

  -- 1. Buscar aluno existente no sistema
  SELECT id, grade, gender INTO v_student_id, v_db_student_grade, v_db_student_gender FROM students 
  WHERE LOWER(TRIM(REGEXP_REPLACE(name || ' ' || COALESCE(surname, ''), '\s+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE(p_student_name || ' ' || COALESCE(p_student_surname, ''), '\s+', ' ', 'g')))
     OR LOWER(TRIM(name)) = LOWER(TRIM(REGEXP_REPLACE(p_student_name || ' ' || COALESCE(p_student_surname, ''), '\s+', ' ', 'g')))
     OR (LOWER(TRIM(name)) = LOWER(TRIM(p_student_name)) AND LOWER(TRIM(COALESCE(surname, ''))) = LOWER(TRIM(COALESCE(p_student_surname, ''))))
  LIMIT 1
  FOR UPDATE;

  IF v_student_id IS NOT NULL THEN
    IF v_db_student_grade IS NOT NULL AND v_db_student_grade != '' AND v_db_student_grade != '-' THEN
      v_effective_grade := v_db_student_grade;
    ELSE
      v_effective_grade := p_student_grade;
      IF p_student_grade IS NOT NULL AND p_student_grade != '' AND p_student_grade != '-' THEN
        UPDATE students SET grade = p_student_grade WHERE id = v_student_id;
      END IF;
    END IF;
  ELSE
    IF v_enable_autocomplete = true THEN
      RETURN jsonb_build_object('success', false, 'error', 'Inscrição recusada: o nome "' || TRIM(p_student_name || ' ' || COALESCE(p_student_surname, '')) || '" não está cadastrado no banco de dados. Selecione o nome na lista.');
    END IF;

    v_effective_grade := p_student_grade;
    INSERT INTO students (name, surname, grade, class, type)
    VALUES (p_student_name, p_student_surname, p_student_grade, p_student_class, p_participant_type)
    RETURNING id INTO v_student_id;
  END IF;

  v_normalized_input_grade := LOWER(TRIM(REPLACE(REPLACE(COALESCE(v_effective_grade, ''), 'º', '°'), ' ', '')));
  v_base_modality := LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(v_event_name, '\(.*\)', '', 'g'), '\mEM\M', '', 'g'), '[\s\t\n\r]+', ' ', 'g')));

  -- 2. Validar restrição de ano do evento contra a SÉRIE REAL DO ALUNO
  IF p_participant_type = 'student' AND v_restrictions IS NOT NULL AND v_restrictions->>'type' = 'years' AND v_restrictions->'values' IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_restrictions->'values') val
      WHERE LOWER(TRIM(REPLACE(REPLACE(val, 'º', '°'), ' ', ''))) = v_normalized_input_grade
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este aluno pertence ao ' || COALESCE(v_effective_grade, 'outro ano') || ', que não é permitido para este evento.');
    END IF;
  END IF;

  -- 3. Limite de vagas por ano (cotas por série real)
  IF v_limitar_vagas_por_ano = 1 AND v_vagas_por_ano IS NOT NULL AND v_effective_grade IS NOT NULL AND v_effective_grade != '' THEN
    SELECT value::integer INTO v_grade_limit
    FROM jsonb_each_text(v_vagas_por_ano) keyval
    WHERE LOWER(TRIM(REPLACE(REPLACE(keyval.key, 'º', '°'), ' ', ''))) = v_normalized_input_grade
    LIMIT 1;

    IF v_grade_limit IS NOT NULL AND v_grade_limit > 0 THEN
      SELECT COUNT(*) INTO v_grade_count
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      WHERE r.event_id = p_event_id 
        AND r.status = 'approved'
        AND LOWER(TRIM(REPLACE(REPLACE(s.grade, 'º', '°'), ' ', ''))) = v_normalized_input_grade;

      IF v_grade_count >= v_grade_limit THEN
        RETURN jsonb_build_object('success', false, 'error', 'Infelizmente, o limite de ' || v_grade_limit || ' vagas para o ' || v_effective_grade || ' já foi preenchido.');
      END IF;
    END IF;
  END IF;

  -- 3.5 Limite de vagas por gênero
  IF v_limitar_vagas_genero = 1 THEN
    -- Priorizar gênero cadastrado no banco do aluno
    IF v_db_student_gender IS NOT NULL AND TRIM(v_db_student_gender) != '' THEN
      v_user_gender := LOWER(TRIM(v_db_student_gender));
    ELSE
      -- Fallback para p_form_data
      IF p_form_data IS NOT NULL THEN
        SELECT LOWER(TRIM(value::text)) INTO v_user_gender
        FROM jsonb_each(p_form_data)
        WHERE LOWER(key) LIKE '%gênero%' OR LOWER(key) LIKE '%genero%' OR LOWER(key) LIKE '%sexo%'
        LIMIT 1;
      END IF;
    END IF;

    IF v_user_gender IS NOT NULL THEN
      IF v_user_gender LIKE '%masc%' OR v_user_gender = '"m"' OR v_user_gender = 'm' OR v_user_gender = 'masculino' THEN
        IF v_vagas_masculino > 0 THEN
          SELECT COUNT(*) INTO v_gender_count
          FROM registrations r
          LEFT JOIN students s ON r.student_id = s.id
          WHERE r.event_id = p_event_id AND r.status = 'approved'
            AND (
              LOWER(TRIM(COALESCE(s.gender, ''))) LIKE '%masc%'
              OR LOWER(TRIM(COALESCE(s.gender, ''))) = 'm'
              OR (
                (s.gender IS NULL OR s.gender = '') AND
                EXISTS (
                  SELECT 1 FROM jsonb_each(r.form_data)
                  WHERE (LOWER(key) LIKE '%gênero%' OR LOWER(key) LIKE '%genero%' OR LOWER(key) LIKE '%sexo%')
                    AND (LOWER(value::text) LIKE '%masc%' OR LOWER(value::text) = '"m"')
                )
              )
            );
          IF v_gender_count >= v_vagas_masculino THEN
            RETURN jsonb_build_object('success', false, 'error', 'Infelizmente, o limite de vagas para o sexo masculino já foi preenchido.');
          END IF;
        END IF;
      ELSIF v_user_gender LIKE '%fem%' OR v_user_gender = '"f"' OR v_user_gender = 'f' OR v_user_gender = 'feminino' THEN
        IF v_vagas_feminino > 0 THEN
          SELECT COUNT(*) INTO v_gender_count
          FROM registrations r
          LEFT JOIN students s ON r.student_id = s.id
          WHERE r.event_id = p_event_id AND r.status = 'approved'
            AND (
              LOWER(TRIM(COALESCE(s.gender, ''))) LIKE '%fem%'
              OR LOWER(TRIM(COALESCE(s.gender, ''))) = 'f'
              OR (
                (s.gender IS NULL OR s.gender = '') AND
                EXISTS (
                  SELECT 1 FROM jsonb_each(r.form_data)
                  WHERE (LOWER(key) LIKE '%gênero%' OR LOWER(key) LIKE '%genero%' OR LOWER(key) LIKE '%sexo%')
                    AND (LOWER(value::text) LIKE '%fem%' OR LOWER(value::text) = '"f"')
                )
              )
            );
          IF v_gender_count >= v_vagas_feminino THEN
            RETURN jsonb_build_object('success', false, 'error', 'Infelizmente, o limite de vagas para o sexo feminino já foi preenchido.');
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 4. Capacidade máxima do evento
  IF v_max_capacity IS NOT NULL AND v_max_capacity > 0 AND v_registration_count >= v_max_capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Desculpe, o evento já está lotado.');
  END IF;

  -- 5. Restringir duplicidade em eventos da MESMA MODALIDADE
  IF v_restringir_duplicidade = 1 AND v_student_id IS NOT NULL THEN
    SELECT e.name INTO v_conflict_event_name
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.student_id = v_student_id
      AND r.event_id != p_event_id
      AND r.status = 'approved'
      AND LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(e.name, '\(.*\)', '', 'g'), '\mEM\M', '', 'g'), '[\s\t\n\r]+', ' ', 'g'))) = v_base_modality
    LIMIT 1;

    IF v_conflict_event_name IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Inscrição não permitida. O aluno já está inscrito na modalidade "' || v_conflict_event_name || '".');
    END IF;
  END IF;

  -- 6. Verificar duplicidade no próprio evento
  SELECT id INTO v_existing_id
  FROM registrations
  WHERE event_id = p_event_id AND student_id = v_student_id
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este aluno já está inscrito neste evento!');
  END IF;

  -- Insert registration
  INSERT INTO registrations (event_id, student_id, form_data, timestamp, status)
  VALUES (p_event_id, v_student_id, p_form_data, NOW(), COALESCE(p_form_data->>'status', 'approved'));

  -- Update count
  UPDATE events SET registration_count = COALESCE(registration_count, 0) + 1
  WHERE id = p_event_id;

  RETURN jsonb_build_object('success', true, 'student_id', v_student_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não foi possível concluir a inscrição no momento. Por favor, tente novamente em instantes.');
END;
$function$;
