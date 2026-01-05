import pool from './src/config/db.js';

async function migrate() {
    try {
        console.log('🚀 Starting migration: Converting check_in and check_out to VARCHAR...');

        // 1. Alter check_in column
        await pool.execute(`
      ALTER TABLE attendance 
      MODIFY COLUMN check_in VARCHAR(255) DEFAULT NULL;
    `);
        console.log('✅ check_in converted to VARCHAR');

        // 2. Alter check_out column
        await pool.execute(`
      ALTER TABLE attendance 
      MODIFY COLUMN check_out VARCHAR(255) DEFAULT NULL;
    `);
        console.log('✅ check_out converted to VARCHAR');

        console.log('🎉 Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
