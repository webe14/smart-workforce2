import express from 'express';
import { createShift, createBulkShifts, getShifts, updateShift, deleteShift } from '../controllers/shiftController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/', authenticateToken, authorizeRoles('admin', 'hr', 'attendance_manager'), createShift);
router.post('/bulk', authenticateToken, authorizeRoles('admin', 'hr', 'attendance_manager'), createBulkShifts);
router.get('/', authenticateToken, getShifts);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'hr', 'attendance_manager'), updateShift);
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'hr', 'attendance_manager'), deleteShift);

export default router;