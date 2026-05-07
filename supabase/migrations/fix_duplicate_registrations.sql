-- ============================================================
-- CORREÇÃO: Inscrições duplicadas e RPC atômico
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Remove duplicatas existentes (mantém apenas a mais recente)
DELETE FROM registrations r1
USING registrations r2
WHERE r1.id < r2.id
  AND r1.event_id = r2.event_id
  AND r1.student_id = r2.student_id
  AND r1.student_id IS NOT NULL;

-- 2. Remove alunos duplicados (mantém o mais antigo)
DELETE FROM students s1
USING students s2
WHERE s1.id > s2.id
  AND LOWER(TRIM(s1.name)) = LOWER(TRIM(s2.name))
  AND LOWER(TRIM(s1.surname)) = LOWER(TRIM(s2.surname));

-- 3. Constraints únicas no banco
ALTER TABLE students ADD CONSTRAINT students_name_surname_unique UNIQUE (name, surname);

-- 4. Recria a função register_participant com verificação atômica de duplicatas
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
  v_existing_id UUID;
  v_registration_count INTEGER;
  v_max_capacity INTEGER;
BEGIN
  -- Verificar capacidade do evento
  SELECT max_capacity, registration_count INTO v_max_capacity, v_registration_count
  FROM events WHERE id = p_event_id FOR UPDATE;
  
  IF v_max_capacity IS NOT NULL AND v_max_capacity > 0 AND v_registration_count >= v_max_capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento lotado');
  END IF;

  -- Buscar ou criar student (com INSERT ... ON CONFLICT para atomicidade)
  INSERT INTO students (name, surname, grade, class, type)
  VALUES (p_student_name, p_student_surname, p_student_grade, p_student_class, p_participant_type)
  ON CONFLICT (name, surname) DO UPDATE SET
    grade = COALESCE(NULLIF(p_student_grade, ''), students.grade),
    class = COALESCE(NULLIF(p_student_class, ''), students.class)
  RETURNING id INTO v_student_id;

  -- Verificar se já existe inscrição para este aluno neste evento (atomicamente)
  SELECT id INTO v_existing_id
  FROM registrations
  WHERE event_id = p_event_id AND student_id = v_student_id
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este aluno já está inscrito neste evento!');
  END IF;

  -- Inserir inscrição
  INSERT INTO registrations (event_id, student_id, form_data, timestamp)
  VALUES (p_event_id, v_student_id, p_form_data, NOW());

  -- Atualizar contagem
  UPDATE events SET registration_count = COALESCE(registration_count, 0) + 1
  WHERE id = p_event_id;

  RETURN jsonb_build_object('success', true, 'student_id', v_student_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este aluno já está inscrito neste evento!');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
