import express from 'express';
import { getAttendanceReport, getPayrollReport, createPayroll } from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/attendance', authenticateToken, authorizeRoles('admin', 'hr'), getAttendanceReport);
router.get('/payroll', authenticateToken, authorizeRoles('admin', 'hr'), getPayrollReport);
router.post('/payroll', authenticateToken, authorizeRoles('admin', 'hr'), createPayroll);

export default router;