
import dotenv from 'dotenv';
import pool from '../src/config/db.js';

dotenv.config();

const runMigration = async () => {
    try {
        console.log('Running migration: Add face_descriptor column to users table...');

        const [rows] = await pool.execute("SHOW COLUMNS FROM users LIKE 'face_descriptor'");

        if (rows.length > 0) {
            console.log('Column face_descriptor already exists. Skipping.');
        } else {
            await pool.execute('ALTER TABLE users ADD COLUMN face_descriptor TEXT DEFAULT NULL');
            console.log('SUCCESS: face_descriptor column added.');
        }
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
};

runMigration();
