-- Add attendance_manager role to users table
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'hr', 'employee', 'attendance_manager') DEFAULT 'employee';

-- Insert Attendance Manager user with plain text password
INSERT INTO users (full_name, email, password, role, department, phone_number) VALUES
('Attendance Manager', 'attmanager@gmail.com', 'attmanager123', 'attendance_manager', 'Management', '1234567893');
