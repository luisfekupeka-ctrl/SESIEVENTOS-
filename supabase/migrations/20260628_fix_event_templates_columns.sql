-- Migration to align event_templates table with events table columns
-- This prevents database insertion errors when saving events as templates

ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL;
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS is_paid INTEGER DEFAULT 0;
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS restringir_duplicidade INTEGER DEFAULT 0;
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS restringir_dias INTEGER DEFAULT 0;
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS dias_semana JSONB DEFAULT '[]'::jsonb;
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS registration_open_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS countdown_target_at TEXT;
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS enable_autocomplete BOOLEAN DEFAULT true;
