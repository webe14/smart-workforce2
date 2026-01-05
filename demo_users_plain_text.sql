-- ====================================================================
-- DEMO USER DATA - PLAIN TEXT PASSWORDS (NO HASHING)
-- ====================================================================
-- ⚠️ WARNING: This is for DEMO/DEVELOPMENT ONLY - NOT for production!
-- ====================================================================

USE smart_workforce_db;

-- Clear existing users (optional - uncomment if you want fresh start)
-- DELETE FROM users;

-- Method 1: UPDATE existing users with plain text passwords
-- This keeps the same user IDs if you have existing data
UPDATE users SET password = 'admin123' WHERE email = 'admin@gmail.com';
UPDATE users SET password = 'hr123' WHERE email = 'hr@gmail.com';
UPDATE users SET password = 'employee123' WHERE email = 'emp1@gmail.com';

-- Method 2: OR Delete and insert fresh demo users
-- Uncomment the following if you want to start fresh:

/*
DELETE FROM users;

INSERT INTO users (full_name, email, password, role, department, phone_number, status) VALUES
('Admin User', 'admin@gmail.com', 'admin123', 'admin', 'Management', '1234567890', 'active'),
('HR Manager', 'hr@gmail.com', 'hr123', 'hr', 'Human Resources', '1234567891', 'active'),
('John Doe', 'john@gmail.com', 'employee123', 'employee', 'Engineering', '1234567892', 'active'),
('Sarah Smith', 'sarah@gmail.com', 'employee123', 'employee', 'Marketing', '1234567893', 'active'),
('Mike Johnson', 'mike@gmail.com', 'employee123', 'employee', 'Sales', '1234567894', 'active');
*/
