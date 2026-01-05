import express from 'express';
import {
    getAllPayroll,
    getPayrollByUser,
    getPayrollById,
    generatePayroll,
    generateBulkPayroll,
    calculatePayrollPreview,
    updatePayroll,
    deletePayroll
} from '../controllers/payrollController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All routes require authentication and HR/Admin role
router.get('/', authenticateToken, authorizeRoles('admin', 'hr'), getAllPayroll);
router.get('/user/:userId', authenticateToken, authorizeRoles('admin', 'hr'), getPayrollByUser);
router.get('/:id', authenticateToken, authorizeRoles('admin', 'hr'), getPayrollById);
router.post('/generate', authenticateToken, authorizeRoles('admin', 'hr'), generatePayroll);
router.post('/generate-bulk', authenticateToken, authorizeRoles('admin', 'hr'), generateBulkPayroll);
router.post('/calculate', authenticateToken, authorizeRoles('admin', 'hr'), calculatePayrollPreview);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'hr'), updatePayroll);
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'hr'), deletePayroll);

export default router;
