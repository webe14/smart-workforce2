import pool from '../config/db.js';

class AuditLog {
  static async create(logData) {
    const { user_id, action, entity, entity_id, ip_address } = logData;
    await pool.execute(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user_id, action, entity, entity_id, ip_address]
    );
  }

  static async findAll() {
    const [rows] = await pool.execute('SELECT al.*, u.full_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.user_id ORDER BY al.timestamp DESC');
    return rows;
  }
}

export default AuditLog;