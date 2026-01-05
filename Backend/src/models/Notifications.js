import pool from '../config/db.js';

class Notification {
  static async create(notificationData) {
    const { user_id, title, message } = notificationData;
    const [result] = await pool.execute(
      'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [user_id, title, message]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    const [rows] = await pool.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return rows;
  }

  static async markAsRead(notificationId) {
    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE notification_id = ?', [notificationId]);
  }

  static async delete(notificationId) {
    await pool.execute('DELETE FROM notifications WHERE notification_id = ?', [notificationId]);
  }
}

export default Notification;