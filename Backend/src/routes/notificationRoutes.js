import express from 'express';
import { getUserNotifications, markRead } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, getUserNotifications);
router.put('/:id/read', authenticateToken, markRead);

export default router;
