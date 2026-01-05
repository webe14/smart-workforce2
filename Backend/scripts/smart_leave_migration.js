import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from Backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_workforce',
    multipleStatements: true
};

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Add joining_date to users if not exists
        console.log('Checking users table...');
        const [userColumns] = await connection.execute("SHOW COLUMNS FROM users LIKE 'joining_date'");
        if (userColumns.length === 0) {
            console.log('Adding joining_date to users...');
            await connection.execute("ALTER TABLE users ADD COLUMN joining_date DATE DEFAULT (CURRENT_DATE)");
        } else {
            console.log('joining_date already exists in users.');
        }

        // 2. Create leave_balances table
        console.log('Creating leave_balances table...');
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        year INT NOT NULL,
        total_entitlement INT DEFAULT 0,
        used INT DEFAULT 0,
        remaining INT DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY unique_balance (user_id, leave_type, year)
      )
    `);

        // 3. Add columns to leave_requests
        console.log('Checking leave_requests table...');
        const [reqColumns] = await connection.execute("SHOW COLUMNS FROM leave_requests LIKE 'document_path'");
        if (reqColumns.length === 0) {
            console.log('Adding document_path and rejection_reason to leave_requests...');
            await connection.execute(`
            ALTER TABLE leave_requests 
            ADD COLUMN document_path VARCHAR(255) NULL,
            ADD COLUMN rejection_reason TEXT NULL
        `);
        } else {
            console.log('leave_requests already updated.');
        }

        console.log('✅ Migration completed successfully.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
