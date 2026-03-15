export interface Category {
  id: string;
  name: string;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'select';
  options?: string[];
  required: boolean;
}

export interface EventRestrictions {
  type: 'all' | 'years' | 'classes' | 'collaborators';
  values: string[];
}

export interface Event {
  id: string;
  name: string;
  category_id: string;
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
}

export interface EventTemplate extends Omit<Event, 'id' | 'registration_count'> {
  id: string;
}
