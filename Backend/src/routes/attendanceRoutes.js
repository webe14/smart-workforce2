import express from 'express';
import { checkIn, checkOut, getAttendance, getAllUsers, addAttendance, updateAttendance, deleteAttendance, qrCheckIn, qrCheckOut, faceCheckIn, faceCheckOut, checkAttendanceStatus } from '../controllers/attendanceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/checkin', authenticateToken, checkIn);
router.post('/checkout', authenticateToken, checkOut);
router.get('/', authenticateToken, getAttendance);
router.get('/users', authenticateToken, getAllUsers);
router.get('/status', authenticateToken, checkAttendanceStatus); // Pre-check attendance status
router.post('/manual', authenticateToken, addAttendance);
router.put('/:id', authenticateToken, updateAttendance);
router.delete('/:id', authenticateToken, deleteAttendance);
router.post('/qr-checkin', authenticateToken, qrCheckIn);
router.post('/qr-checkout', authenticateToken, qrCheckOut);
router.post('/mark', authenticateToken, qrCheckIn); // Unified endpoint for check-in/check-out
router.post('/face-checkin', authenticateToken, faceCheckIn);
router.post('/face-checkout', authenticateToken, faceCheckOut);

export default router;