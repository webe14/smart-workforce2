import pool from './src/config/db.js';

const migrate = async () => {
    try {
        console.log('Adding "sex" column to users table...');
        await pool.execute("ALTER TABLE users ADD COLUMN sex ENUM('Male', 'Female') DEFAULT NULL");
        console.log('Successfully added "sex" column.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('"sex" column already exists.');
            process.exit(0);
        } else {
            console.error('Error adding column:', error);
            process.exit(1);
        }
    }
};

migrate();
