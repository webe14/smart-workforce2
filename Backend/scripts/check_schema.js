const pool = require('../src/config/db');

async function checkSchema() {
    try {
        const [rows] = await pool.execute('DESCRIBE attendance');
        console.log(rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
