-- Migration to add subcategories, alter events, and update validation in register_participant

-- 1. Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(category_id, name)
);

-- 2. Alter events table to add category/subcategory and validation columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_paid INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS restringir_duplicidade INTEGER DEFAULT 0;

-- 3. Seed "Esporte" and "Cultura" subcategories under the "After" category in Supabase
INSERT INTO categories (name) VALUES ('After') ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_after_id UUID;
BEGIN
  SELECT id INTO v_after_id FROM categories WHERE name = 'After';
  IF v_after_id IS NOT NULL THEN
    INSERT INTO subcategories (category_id, name) 
    VALUES (v_after_id, 'Esporte')
    ON CONFLICT (category_id, name) DO NOTHING;
    
    INSERT INTO subcategories (category_id, name) 
    VALUES (v_after_id, 'Cultura')
    ON CONFLICT (category_id, name) DO NOTHING;
  END IF;
END $$;

-- 4. Update register_participant database function with validations
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
  
  -- Validation variables
  v_restrictions JSONB;
  v_category_id UUID;
  v_subcategory_id UUID;
  v_restringir_duplicidade INTEGER;
  v_conflict_event_name TEXT;
BEGIN
  -- Fetch Event details for verification
  SELECT max_capacity, registration_count, restrictions, category_id, subcategory_id, restringir_duplicidade
  INTO v_max_capacity, v_registration_count, v_restrictions, v_category_id, v_subcategory_id, v_restringir_duplicidade
  FROM events WHERE id = p_event_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento não encontrado.');
  END IF;

  -- 1. Validate school year/grade restrictions
  IF p_participant_type = 'student' AND v_restrictions->>'type' = 'years' THEN
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_restrictions->'values') val
      WHERE val = p_student_grade
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este aluno não pertence aos anos escolares permitidos para este evento.');
    END IF;
  END IF;

  -- Verify capacity
  IF v_max_capacity IS NOT NULL AND v_max_capacity > 0 AND v_registration_count >= v_max_capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento lotado');
  END IF;

  -- Buscar ou criar student
  INSERT INTO students (name, surname, grade, class, type)
  VALUES (p_student_name, p_student_surname, p_student_grade, p_student_class, p_participant_type)
  ON CONFLICT (name, surname) DO UPDATE SET
    grade = COALESCE(NULLIF(p_student_grade, ''), students.grade),
    class = COALESCE(NULLIF(p_student_class, ''), students.class)
  RETURNING id INTO v_student_id;

  -- 2. Validate duplicate registrations in other events of the same category and type
  IF v_restringir_duplicidade = 1 AND v_student_id IS NOT NULL THEN
    SELECT e.name INTO v_conflict_event_name
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.student_id = v_student_id
      AND r.event_id != p_event_id
      AND e.category_id = v_category_id
      AND e.subcategory_id = v_subcategory_id
      AND r.status = 'approved'
    LIMIT 1;

    IF v_conflict_event_name IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Inscrição não permitida. O aluno já está inscrito no evento "' || v_conflict_event_name || '" da mesma categoria e tipo/subcategoria.');
    END IF;
  END IF;

  -- Verificar se já existe inscrição para este aluno neste evento
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
