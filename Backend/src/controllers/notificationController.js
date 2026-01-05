import Notification from '../models/Notifications.js';

const getUserNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findByUserId(req.user.id);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markRead = async (req, res) => {
    try {
        await Notification.markAsRead(req.params.id);
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export { getUserNotifications, markRead };
