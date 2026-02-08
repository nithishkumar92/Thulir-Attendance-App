-- Add duty_points column to attendance table
ALTER TABLE attendance 
ADD COLUMN duty_points NUMERIC DEFAULT 0;

-- Optional: Comment on column
COMMENT ON COLUMN attendance.duty_points IS 'Calculated duty points based on time-slot validation (0.5 per valid slot)';
