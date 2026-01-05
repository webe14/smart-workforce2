import pool from '../src/config/db.js';

async function checkAuditLogSchema() {
    try {
        console.log("--- audit_logs table ---");
        const [cols] = await pool.execute("DESCRIBE audit_logs");
        console.table(cols);
    } catch (error) {
        console.error("audit_logs check failed:", error);
    } finally {
        process.exit();
    }
}

checkAuditLogSchema();
