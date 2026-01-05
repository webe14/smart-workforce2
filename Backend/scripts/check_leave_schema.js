import pool from '../src/config/db.js';

async function checkLeaveSchema() {
    try {
        const [rows] = await pool.execute('DESCRIBE leave_balances');
        rows.forEach(r => console.log(`${r.Field}: ${r.Type}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkLeaveSchema();
