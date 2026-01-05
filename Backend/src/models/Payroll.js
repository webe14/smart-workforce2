import pool from '../config/db.js';

class Payroll {
  static async create(payrollData) {
    const {
      user_id,
      pay_period_start,
      pay_period_end,
      gross_salary,
      allowances,
      total_earnings,
      income_tax,
      employee_pension,
      employer_pension,
      other_deductions,
      total_deductions,
      net_salary,
      total_hours,
      overtime_hours
    } = payrollData;

    const [result] = await pool.execute(
      `INSERT INTO payroll (
        user_id, pay_period_start, pay_period_end, gross_salary, allowances,
        total_earnings, income_tax, employee_pension, employer_pension,
        other_deductions, total_deductions, net_salary, total_hours, overtime_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, pay_period_start, pay_period_end, gross_salary || 0, allowances || 0,
        total_earnings || 0, income_tax || 0, employee_pension || 0, employer_pension || 0,
        other_deductions || 0, total_deductions || 0, net_salary || 0,
        total_hours || 0, overtime_hours || 0
      ]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM payroll WHERE user_id = ? ORDER BY processed_on DESC',
      [userId]
    );
    return rows;
  }

  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT p.*, u.full_name, u.department, u.role 
       FROM payroll p 
       JOIN users u ON p.user_id = u.user_id 
       ORDER BY p.processed_on DESC`
    );
    return rows;
  }

  static async findByPeriod(startDate, endDate) {
    const [rows] = await pool.execute(
      `SELECT p.*, u.full_name, u.department 
       FROM payroll p 
       JOIN users u ON p.user_id = u.user_id 
       WHERE p.pay_period_start >= ? AND p.pay_period_end <= ?
       ORDER BY u.full_name`,
      [startDate, endDate]
    );
    return rows;
  }

  static async findById(payrollId) {
    const [rows] = await pool.execute(
      `SELECT p.*, u.full_name, u.department, u.email 
       FROM payroll p 
       JOIN users u ON p.user_id = u.user_id 
       WHERE p.payroll_id = ?`,
      [payrollId]
    );
    return rows[0];
  }

  static async update(payrollId, payrollData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'gross_salary', 'allowances', 'total_earnings', 'income_tax',
      'employee_pension', 'employer_pension', 'other_deductions',
      'total_deductions', 'net_salary', 'total_hours', 'overtime_hours', 'status'
    ];

    for (const field of allowedFields) {
      if (payrollData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(payrollData[field]);
      }
    }

    if (fields.length === 0) return false;

    values.push(payrollId);
    const [result] = await pool.execute(
      `UPDATE payroll SET ${fields.join(', ')} WHERE payroll_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(payrollId) {
    const [result] = await pool.execute(
      'DELETE FROM payroll WHERE payroll_id = ?',
      [payrollId]
    );
    return result.affectedRows > 0;
  }
}

export default Payroll;