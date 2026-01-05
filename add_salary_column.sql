-- Add salary column to users table
ALTER TABLE users ADD COLUMN salary DECIMAL(12, 2) DEFAULT NULL;

-- Update existing users with sample salaries (optional)
-- UPDATE users SET salary = 10000 WHERE role = 'employee';
-- UPDATE users SET salary = 15000 WHERE role = 'hr';
-- UPDATE users SET salary = 20000 WHERE role = 'admin';
-- UPDATE users SET salary = 12000 WHERE role = 'attendance_manager';
