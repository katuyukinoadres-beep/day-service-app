-- Add ai_text column to daily_records for AI-generated support record text
ALTER TABLE daily_records ADD COLUMN ai_text TEXT DEFAULT NULL;
