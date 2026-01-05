import pool from '../config/db.js';

class Shift {
  static async create(shiftData) {
    const { user_id, shift_type, shift_date, start_time, end_time } = shiftData;
    const [result] = await pool.execute(
      'INSERT INTO shifts (user_id, shift_type, shift_date, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
      [user_id, shift_type, shift_date, start_time, end_time]
    );
    return result.insertId;
  }

  static async bulkCreate(shifts) {
    if (!shifts || shifts.length === 0) return;

    // Flatten data for bulk insert
    const values = shifts.map(s => [s.user_id, s.shift_type, s.shift_date, s.start_time, s.end_time]);
    const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const flatValues = values.flat();

    const [result] = await pool.execute(
      `INSERT INTO shifts (user_id, shift_type, shift_date, start_time, end_time) VALUES ${placeholders}`,
      flatValues
    );
    return result.affectedRows;
  }

  static async findByUserId(userId) {
    const [rows] = await pool.execute('SELECT * FROM shifts WHERE user_id = ? ORDER BY shift_date DESC', [userId]);
    return rows;
  }

  static async findAll() {
    const [rows] = await pool.execute('SELECT s.*, u.full_name FROM shifts s JOIN users u ON s.user_id = u.user_id ORDER BY s.shift_date DESC');
    return rows;
  }

  static async findByUserIdAndDate(userId, date) {
    const [rows] = await pool.execute('SELECT * FROM shifts WHERE user_id = ? AND shift_date = ?', [userId, date]);
    return rows;
  }

  static async findAllByDate(date) {
    const [rows] = await pool.execute('SELECT s.*, u.full_name FROM shifts s JOIN users u ON s.user_id = u.user_id WHERE s.shift_date = ?', [date]);
    return rows;
  }

  static async update(shiftId, shiftData) {
    const { shift_type, shift_date, start_time, end_time, status } = shiftData;
    await pool.execute(
      'UPDATE shifts SET shift_type = ?, shift_date = ?, start_time = ?, end_time = ?, status = ? WHERE shift_id = ?',
      [shift_type, shift_date, start_time, end_time, status, shiftId]
    );
  }

  static async delete(shiftId) {
    await pool.execute('DELETE FROM shifts WHERE shift_id = ?', [shiftId]);
  }
}

export default Shift;