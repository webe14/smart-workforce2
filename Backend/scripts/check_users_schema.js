import pool from '../src/config/db.js';

async function checkUserSchema() {
    try {
        const [rows] = await pool.execute('DESCRIBE users');
        console.log('Schema for users table:');
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}

checkUserSchema();
