import pool from './src/config/db.js';

const checkNotifications = async () => {
    try {
        console.log('Checking recent notifications...');
        const [rows] = await pool.execute('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
        console.log('Recent Notifications:', rows);

        if (rows.length === 0) {
            console.log('No notifications found in the database.');
        } else {
            console.log(`Found ${rows.length} notifications.`);
        }
        process.exit(0);
    } catch (error) {
        console.error('Error checking notifications:', error);
        process.exit(1);
    }
};

checkNotifications();
