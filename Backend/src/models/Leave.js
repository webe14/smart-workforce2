import pool from '../config/db.js';

class Leave {
  static async create(leaveData) {
    const { user_id, leave_type, start_date, end_date, reason, document_path } = leaveData;
    const [result] = await pool.execute(
      'INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, document_path) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, leave_type, start_date, end_date, reason, document_path || null]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    const [rows] = await pool.execute('SELECT * FROM leave_requests WHERE user_id = ? ORDER BY applied_on DESC', [userId]);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM leave_requests WHERE leave_id = ?', [id]);
    return rows[0];
  }

  static async findAll() {
    const [rows] = await pool.execute('SELECT lr.*, u.full_name FROM leave_requests lr JOIN users u ON lr.user_id = u.user_id ORDER BY lr.applied_on DESC');
    return rows;
  }

  static async updateStatus(leaveId, status, rejectionReason = null) {
    let query = 'UPDATE leave_requests SET status = ?';
    const params = [status];

    if (rejectionReason) {
      query += ', rejection_reason = ?';
      params.push(rejectionReason);
    }

    query += ' WHERE leave_id = ?';
    params.push(leaveId);

    await pool.execute(query, params);
  }

  static async delete(leaveId) {
    await pool.execute('DELETE FROM leave_requests WHERE leave_id = ?', [leaveId]);
  }
}

export default Leave;