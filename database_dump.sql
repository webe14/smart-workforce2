-- Database Dump for Smart Workforce Management and Attendance Tracking Platform
-- Database Name: smart_workforce_db

CREATE DATABASE IF NOT EXISTS smart_workforce_db;
USE smart_workforce_db;

-- Users table
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'hr', 'employee') DEFAULT 'employee',
  department VARCHAR(100),
  phone_number VARCHAR(20),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  check_in DATETIME,
  check_out DATETIME,
  total_hours DECIMAL(5,2),
  status ENUM('Present', 'Absent', 'On Leave') DEFAULT 'Present',
  attendance_date DATE DEFAULT (CURRENT_DATE),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Shifts table
CREATE TABLE shifts (
  shift_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  shift_type ENUM('Morning', 'Evening', 'Night') DEFAULT 'Morning',
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Leave requests table
CREATE TABLE leave_requests (
  leave_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  leave_type ENUM('Sick', 'Vacation', 'Emergency', 'Other') DEFAULT 'Other',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  applied_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Payroll table
CREATE TABLE payroll (
  payroll_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_hours DECIMAL(6,2),
  overtime_hours DECIMAL(6,2) DEFAULT 0,
  base_salary DECIMAL(10,2),
  deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2),
  pay_period_start DATE,
  pay_period_end DATE,
  processed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Audit logs table
CREATE TABLE audit_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255),
  entity VARCHAR(100),
  entity_id INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Sample data
INSERT INTO users (full_name, email, password, role, department, phone_number) VALUES
('Admin User', 'admin@gmail.com', '$2b$10$CY2pNmGdoLtWV9kB80AvSO27oS4LoAxCVRjUlMerl9ENcxyUNGX0q', 'admin', 'Management', '1234567890'),
('HR User', 'hr@gmail.com', '$2b$10$CY2pNmGdoLtWV9kB80AvSO27oS4LoAxCVRjUlMerl9ENcxyUNGX0q', 'hr', 'HR', '1234567891'),
('Employee One', 'emp1@gmail.com', '$2b$10$CY2pNmGdoLtWV9kB80AvSO27oS4LoAxCVRjUlMerl9ENcxyUNGX0q', 'employee', 'Nursing', '1234567892');