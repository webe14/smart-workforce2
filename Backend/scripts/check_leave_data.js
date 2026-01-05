import pool from '../src/config/db.js';

async function checkLeaveData(leaveId) {
    try {
        const [rows] = await pool.execute('SELECT * FROM leave_requests WHERE leave_id = ?', [leaveId]);
        console.log(JSON.stringify(rows[0]));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkLeaveData(15);
