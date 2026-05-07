-- 1. Melhoria de Erro na UI
-- Ajustado ErrorBoundary.tsx para exibir "Instabilidade no Sistema" em vez de "Manutenção"

-- 2. Limpeza de duplicatas e restrição de uma oficina por aluno
DELETE FROM registrations r1
USING registrations r2
WHERE r1.id < r2.id
  AND r1.event_id = r2.event_id
  AND r1.student_id = r2.student_id;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_event_student_unique') THEN
        ALTER TABLE registrations ADD CONSTRAINT registrations_event_student_unique UNIQUE (event_id, student_id);
    END IF;
END $$;

-- 3. Unificação de alunos duplicados e remoção de múltiplas oficinas
DO $$
DECLARE
    r RECORD;
    v_keep_id UUID;
BEGIN
    FOR r IN (
        SELECT LOWER(TRIM(name)) as ln, LOWER(TRIM(surname)) as ls 
        FROM students 
        GROUP BY 1, 2 
        HAVING COUNT(*) > 1
    ) LOOP
        SELECT id INTO v_keep_id FROM students 
        WHERE LOWER(TRIM(name)) = r.ln AND LOWER(TRIM(surname)) = r.ls 
        ORDER BY created_at ASC LIMIT 1;

        DELETE FROM registrations r_new
        WHERE r_new.student_id IN (
            SELECT id FROM students WHERE LOWER(TRIM(name)) = r.ln AND LOWER(TRIM(surname)) = r.ls AND id != v_keep_id
        )
        AND EXISTS (
            SELECT 1 FROM registrations r_old WHERE r_old.student_id = v_keep_id AND r_old.event_id = r_new.event_id
        );

        UPDATE registrations SET student_id = v_keep_id 
        WHERE student_id IN (
            SELECT id FROM students WHERE LOWER(TRIM(name)) = r.ln AND LOWER(TRIM(surname)) = r.ls AND id != v_keep_id
        );

        DELETE FROM students WHERE LOWER(TRIM(name)) = r.ln AND LOWER(TRIM(surname)) = r.ls AND id != v_keep_id;
    END LOOP;
END $$;

DELETE FROM registrations r_outer
WHERE r_outer.id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY timestamp ASC) as rank
        FROM registrations
    ) t WHERE t.rank > 1
);

-- 4. Otimização da Função de Inscrição (Alta Concorrência)
DROP FUNCTION IF EXISTS register_participant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION register_participant(
  p_event_id UUID,
  p_student_name TEXT,
  p_student_surname TEXT,
  p_student_grade TEXT DEFAULT NULL,
  p_student_class TEXT DEFAULT NULL,
  p_participant_type TEXT DEFAULT 'student',
  p_form_data JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_updated_rows INTEGER;
BEGIN
  INSERT INTO students (name, surname, grade, class, type)
  VALUES (p_student_name, p_student_surname, p_student_grade, p_student_class, p_participant_type)
  ON CONFLICT (name, surname) DO UPDATE SET
    grade = COALESCE(NULLIF(p_student_grade, ''), students.grade),
    class = COALESCE(NULLIF(p_student_class, ''), students.class)
  RETURNING id INTO v_student_id;

  INSERT INTO registrations (event_id, student_id, form_data, timestamp)
  VALUES (p_event_id, v_student_id, p_form_data, NOW())
  ON CONFLICT (event_id, student_id) DO NOTHING;
  
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  
  IF v_updated_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este aluno já está inscrito neste evento!');
  END IF;

  UPDATE events 
  SET registration_count = COALESCE(registration_count, 0) + 1
  WHERE id = p_event_id 
    AND (max_capacity IS NULL OR max_capacity = 0 OR registration_count < max_capacity);
  
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    DELETE FROM registrations WHERE event_id = p_event_id AND student_id = v_student_id;
    RETURN jsonb_build_object('success', false, 'error', 'Evento lotado');
  END IF;

  RETURN jsonb_build_object('success', true, 'student_id', v_student_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Sincronização de contagem final
UPDATE events e SET registration_count = (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id);
