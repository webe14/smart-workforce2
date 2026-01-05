import pool from '../src/config/db.js';

async function checkSchema() {
    try {
        console.log('Checking users table columns...');
        const [columns] = await pool.execute('SHOW COLUMNS FROM users');
        const names = columns.map(c => c.Field);
        console.log('Columns found:', names.join(', '));

        const expected = [
            'employee_id', 'dob', 'city', 'woreda', 'kebele',
            'education_level', 'field_of_study', 'institution_name', 'graduation_year',
            'job_title', 'employment_type', 'hire_date', 'work_location',
            'emergency_contact_name', 'emergency_contact_phone', 'remarks'
        ];

        const missing = expected.filter(name => !names.includes(name));
        if (missing.length > 0) {
            console.error('CRITICAL: Missing columns in DB:', missing.join(', '));
        } else {
            console.log('SUCCESS: All expected columns are present in the database.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkSchema();
