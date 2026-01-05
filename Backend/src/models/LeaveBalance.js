import pool from '../config/db.js';
import User from './User.js';

class LeaveBalance {
    static async getOrCreate(userId, year, leaveType) {
        // Check if balance exists
        const [rows] = await pool.execute(
            'SELECT * FROM leave_balances WHERE user_id = ? AND year = ? AND leave_type = ?',
            [userId, year, leaveType]
        );

        if (rows.length > 0) {
            return rows[0];
        }

        // Calculate entitlement if not exists
        const entitlement = await this.calculateEntitlement(userId, leaveType);

        // Create new balance record
        await pool.execute(
            'INSERT INTO leave_balances (user_id, leave_type, year, total_entitlement, used, remaining) VALUES (?, ?, ?, ?, 0, ?)',
            [userId, leaveType, year, entitlement, entitlement]
        );

        return {
            user_id: userId,
            leave_type: leaveType,
            year: year,
            total_entitlement: entitlement,
            used: 0,
            remaining: entitlement
        };
    }

    static async calculateEntitlement(userId, leaveType) {
        if (leaveType === 'Annual') {
            const user = await User.findById(userId);
            // Valid joining_date check
            if (!user || !user.joining_date) return 16;

            const joinDate = new Date(user.joining_date);
            const now = new Date();
            // Calculate years difference roughly
            const diffTime = Math.abs(now - joinDate);
            const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);

            // Law: 16 days + 1 day for every 2 years service
            const additionalDays = Math.floor(diffYears / 2);
            return 16 + additionalDays;
        }

        // Fixed entitlements based on policy/law
        if (leaveType === 'Sick') return 180; // Max 6 months
        if (leaveType === 'Maternity') return 120; // 30 pre + 90 post
        if (leaveType === 'Paternity') return 3;
        if (leaveType === 'Special') return 7;

        return 0; // Unpaid or other
    }

    static async deduct(userId, leaveType, year, days) {
        // Ensure balance exists first
        await this.getOrCreate(userId, year, leaveType);

        await pool.execute(
            'UPDATE leave_balances SET used = used + ?, remaining = remaining - ? WHERE user_id = ? AND leave_type = ? AND year = ?',
            [days, days, userId, leaveType, year]
        );
    }

    static async restore(userId, leaveType, year, days) {
        console.log(`[LeaveBalance] Restoring ${days} days for User ${userId} (${leaveType}, ${year})`);

        // Ensure balance exists first
        await this.getOrCreate(userId, year, leaveType);

        const [result] = await pool.execute(
            'UPDATE leave_balances SET used = used - ?, remaining = remaining + ? WHERE user_id = ? AND leave_type = ? AND year = ?',
            [days, days, userId, leaveType, year]
        );
        console.log(`[LeaveBalance] Restore Result: ${result.affectedRows} rows updated.`);
    }

    static async getAllByUserId(userId, year) {
        // Pre-populate common types to ensure they show up in dashboard (Removed Sick and Maternity)
        const commonTypes = ['Annual', 'Paternity', 'Special'];
        for (const type of commonTypes) {
            await this.getOrCreate(userId, year, type);
        }

        const [rows] = await pool.execute(
            'SELECT * FROM leave_balances WHERE user_id = ? AND year = ?',
            [userId, year]
        );
        return rows;
    }
}

export default LeaveBalance;
