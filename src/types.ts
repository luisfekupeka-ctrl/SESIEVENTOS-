export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox' | 'textarea' | 'radio';
  options?: string[];
  required: boolean;
}

export interface EventRestrictions {
  type: 'all' | 'years' | 'classes' | 'collaborators' | 'participant_types';
  values: string[];
}

export interface Event {
  id: string;
  name: string;
  category_id: string;
  subcategory_id?: string;
  description: string;
  image_url: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  duration: string;
  restrictions: EventRestrictions;
  password_protected: boolean;
  password?: string;
  form_fields: FormField[];
  max_capacity?: number;
  registration_count?: number;
  enable_autocomplete?: boolean;
  is_paid?: number;
  restringir_duplicidade?: number;
  restringir_dias?: number;
  dias_semana?: string[] | string;
  registration_open_at?: string;
  countdown_target_at?: string;
  limitar_vagas_por_ano?: number;
  vagas_por_ano?: Record<string, number> | string;
  is_hidden?: number;
  limitar_vagas_genero?: number;
  vagas_masculino?: number;
  vagas_feminino?: number;
}

export interface Student {
  id: string;
  name: string;
  surname: string;
  class: string;
  grade: string;
  type: 'student' | 'collaborator' | 'responsible' | 'other';
}

export interface Registration {
  id: string;
  event_id: string;
  student_id: string;
  form_data: Record<string, any>;
  timestamp: string;
  status?: 'pending' | 'approved';
  students?: Student | null; // Nested student relation
}

export interface EventTemplate extends Omit<Event, 'id' | 'registration_count'> {
  id: string;
}
