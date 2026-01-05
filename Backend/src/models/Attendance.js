import pool from '../config/db.js';

class Attendance {
  static async checkIn(userId, checkInTime) {
    const [result] = await pool.execute(
      'INSERT INTO attendance (user_id, check_in, attendance_date, status) VALUES (?, ?, CURDATE(), ?)',
      [userId, checkInTime, 'present']
    );
    return result.insertId;
  }

  static async checkOut(attendanceId, checkOutTime) {
    const [result] = await pool.execute(
      'UPDATE attendance SET check_out = ?, total_hours = TIMESTAMPDIFF(HOUR, check_in, ?) WHERE attendance_id = ?',
      [checkOutTime, checkOutTime, attendanceId]
    );
    return result.affectedRows > 0;
  }

  static async findByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT *, DATE_FORMAT(attendance_date, "%Y-%m-%d") as date FROM attendance WHERE user_id = ? ORDER BY attendance_date DESC',
      [userId]
    );
    return rows;
  }

  static async findAll() {
    const [rows] = await pool.execute(
      'SELECT a.*, u.full_name, u.role, DATE_FORMAT(a.attendance_date, "%Y-%m-%d") as date FROM attendance a JOIN users u ON a.user_id = u.user_id ORDER BY a.attendance_date DESC'
    );
    return rows;
  }

  static async findAllByDate(date) {
    const [rows] = await pool.execute(
      'SELECT a.*, u.full_name, u.role, DATE_FORMAT(a.attendance_date, "%Y-%m-%d") as date FROM attendance a JOIN users u ON a.user_id = u.user_id WHERE DATE(a.attendance_date) = ?',
      [date]
    );
    return rows;
  }

  static async findByUserAndDate(userId, date) {
    const [rows] = await pool.execute(
      'SELECT * FROM attendance WHERE user_id = ? AND DATE(attendance_date) = ?',
      [userId, date]
    );
    return rows[0];
  }

  static async findByDateRange(startDate, endDate) {
    const [rows] = await pool.execute(
      'SELECT *, DATE_FORMAT(attendance_date, "%Y-%m-%d") as date FROM attendance WHERE attendance_date BETWEEN ? AND ?',
      [startDate, endDate]
    );
    return rows;
  }

  static async findLatestOpenByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM attendance WHERE user_id = ? AND check_out IS NULL ORDER BY attendance_date DESC, check_in DESC LIMIT 1',
      [userId]
    );
    return rows[0];
  }

  static async findById(attendanceId) {
    const [rows] = await pool.execute(
      'SELECT a.*, u.full_name, DATE_FORMAT(a.attendance_date, "%Y-%m-%d") as date FROM attendance a JOIN users u ON a.user_id = u.user_id WHERE a.attendance_id = ?',
      [attendanceId]
    );
    return rows[0];
  }

  static async create(attendanceData) {
    const { user_id, check_in, check_out, attendance_date, status } = attendanceData;
    let total_hours = null;
    if (check_in && check_out) {
      // FIX: Only calculate hours if both are valid times (HH:mm:ss), not strings like 'Absent'
      const isTime = (str) => /^([01]\d|2[0-3]):?([0-5]\d):?([0-5]\d)?/.test(str);

      if (isTime(check_in) && isTime(check_out)) {
        try {
          const checkInTime = new Date(`1970-01-01T${check_in}`);
          const checkOutTime = new Date(`1970-01-01T${check_out}`);
          if (!isNaN(checkInTime) && !isNaN(checkOutTime)) {
            total_hours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2);
          }
        } catch (e) {
          console.error("Error calculating total hours in model:", e);
        }
      }
    }
    const [result] = await pool.execute(
      'INSERT INTO attendance (user_id, check_in, check_out, attendance_date, status, total_hours) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, check_in || null, check_out || null, attendance_date, status || 'present', total_hours]
    );
    return result.insertId;
  }

  static async update(attendanceId, attendanceData) {
    const fields = [];
    const values = [];

    if (attendanceData.check_in !== undefined) {
      fields.push('check_in = ?');
      values.push(attendanceData.check_in);
    }
    if (attendanceData.check_out !== undefined) {
      fields.push('check_out = ?');
      values.push(attendanceData.check_out);
    }
    if (attendanceData.status !== undefined) {
      fields.push('status = ?');
      values.push(attendanceData.status);
    }
    if (attendanceData.total_hours !== undefined) {
      fields.push('total_hours = ?');
      values.push(attendanceData.total_hours);
    }

    if (fields.length === 0) return false;

    values.push(attendanceId);
    const [result] = await pool.execute(
      `UPDATE attendance SET ${fields.join(', ')} WHERE attendance_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(attendanceId) {
    const [result] = await pool.execute('DELETE FROM attendance WHERE attendance_id = ?', [attendanceId]);
    return result.affectedRows > 0;
  }

  static async countMonthlyAbsences(userId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM attendance WHERE user_id = ? AND status = "absent" AND MONTH(attendance_date) = MONTH(CURRENT_DATE()) AND YEAR(attendance_date) = YEAR(CURRENT_DATE())',
      [userId]
    );
    return rows[0].count;
  }
}

export default Attendance;