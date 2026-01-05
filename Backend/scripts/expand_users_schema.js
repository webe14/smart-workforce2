import pool from '../src/config/db.js';

async function updateSchema() {
    try {
        console.log('Adding new columns to users table...');

        const queries = [
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE AFTER user_id',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE AFTER sex',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100) AFTER dob',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS woreda VARCHAR(100) AFTER city',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS kebele VARCHAR(100) AFTER woreda',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS education_level VARCHAR(50) AFTER kebele',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS field_of_study VARCHAR(100) AFTER education_level',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS institution_name VARCHAR(150) AFTER field_of_study',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(10) AFTER institution_name',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100) AFTER role',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) AFTER job_title',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE AFTER joining_date',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS work_location VARCHAR(100) AFTER hire_date',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100) AFTER profile_picture',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20) AFTER emergency_contact_name',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS remarks TEXT AFTER face_descriptor'
        ];

        for (const query of queries) {
            try {
                await pool.execute(query);
                console.log(`Executed: ${query.split('ADD COLUMN')[0]}...`);
            } catch (err) {
                if (err.errno === 1060) {
                    console.log('Column already exists, skipping...');
                } else {
                    throw err;
                }
            }
        }

        console.log('Schema update complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error updating schema:', err);
        process.exit(1);
    }
}

updateSchema();
