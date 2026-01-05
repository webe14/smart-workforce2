import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { createLeaveRequest, getLeaveRequests, updateLeaveStatus, deleteLeaveRequest, getMyBalances } from '../controllers/leaveController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

// Setup Multer for evidence uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/leaves/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Sanitize filename
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only images and PDFs are allowed'));
        }
    }
});

const router = express.Router();

router.post('/', authenticateToken, upload.single('document'), createLeaveRequest);
router.get('/', authenticateToken, getLeaveRequests);
router.get('/balances', authenticateToken, getMyBalances);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'hr'), updateLeaveStatus);
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'hr'), deleteLeaveRequest);

export default router;