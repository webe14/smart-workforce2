import pool from '../src/config/db.js';

async function checkSchema() {
    try {
        console.log("--- leave_balances table ---");
        const [balanceCols] = await pool.execute("DESCRIBE leave_balances");
        console.table(balanceCols);

        console.log("\n--- leave_requests table ---");
        const [requestCols] = await pool.execute("DESCRIBE leave_requests");
        console.table(requestCols);

        console.log("\n--- Current balances for some user ---");
        const [rows] = await pool.execute("SELECT * FROM leave_balances LIMIT 5");
        console.table(rows);

    } catch (error) {
        console.error("Schema check failed:", error);
    } finally {
        process.exit();
    }
}

checkSchema();
