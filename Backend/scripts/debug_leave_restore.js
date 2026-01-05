import dotenv from 'dotenv';
import LeaveBalance from '../src/models/LeaveBalance.js';
import pool from '../src/config/db.js';

dotenv.config();

async function test() {
    try {
        console.log("Testing Restore Logic...");
        // Use a likely valid user ID (e.g., 1) and current year
        const userId = 1;
        const year = new Date().getFullYear();
        const type = 'Annual';
        const days = 1;

        console.log(`Restoring ${days} days for User ${userId}, Type: ${type}, Year: ${year}`);

        await LeaveBalance.restore(userId, type, year, days);

        console.log("✅ Restore executed successfully (no error thrown).");
    } catch (e) {
        console.error("❌ Restore Failed:", e);
    } finally {
        if (pool && pool.end) await pool.end();
        process.exit();
    }
}

test();
