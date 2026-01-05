import pool from '../src/config/db.js';

async function listIds() {
    try {
        const [rows] = await pool.execute('SELECT role, employee_id FROM users');
        console.log('Current IDs in DB:');
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

listIds();
