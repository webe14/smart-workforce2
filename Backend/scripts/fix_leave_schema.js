import pool from '../src/config/db.js';

async function fixSchema() {
    try {
        console.log("Changing leave_type to VARCHAR(50) in leave_requests...");
        await pool.execute("ALTER TABLE leave_requests MODIFY COLUMN leave_type VARCHAR(50)");

        console.log("Cleaning up invalid leave_requests (setting to 'Annual' for demo if empty)...");
        // This is optional but helps with existing bad data from my tests
        await pool.execute("UPDATE leave_requests SET leave_type = 'Annual' WHERE leave_type = ''");

        console.log("✅ Schema updated successfully.");
    } catch (error) {
        console.error("❌ Schema update failed:", error);
    } finally {
        process.exit();
    }
}

fixSchema();
