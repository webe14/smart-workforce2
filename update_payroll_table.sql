-- First, drop the old payroll table and create a new one with all required columns
-- WARNING: This will delete existing payroll data. If you want to keep data, use ALTER TABLE instead.

-- Option 1: Drop and recreate (use this if you have no important payroll data)
DROP TABLE IF EXISTS payroll;

CREATE TABLE payroll (
    payroll_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    gross_salary DECIMAL(12, 2) DEFAULT 0,
    allowances DECIMAL(12, 2) DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0,
    income_tax DECIMAL(12, 2) DEFAULT 0,
    employee_pension DECIMAL(12, 2) DEFAULT 0,
    employer_pension DECIMAL(12, 2) DEFAULT 0,
    other_deductions DECIMAL(12, 2) DEFAULT 0,
    total_deductions DECIMAL(12, 2) DEFAULT 0,
    net_salary DECIMAL(12, 2) DEFAULT 0,
    total_hours DECIMAL(8, 2) DEFAULT 0,
    overtime_hours DECIMAL(8, 2) DEFAULT 0,
    status ENUM('pending', 'processed', 'paid') DEFAULT 'paid',
    processed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Also add salary column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary DECIMAL(12, 2) DEFAULT NULL;

-- If the above doesn't work (IF NOT EXISTS not supported in older MySQL), use this instead:
-- ALTER TABLE users ADD COLUMN salary DECIMAL(12, 2) DEFAULT NULL;
