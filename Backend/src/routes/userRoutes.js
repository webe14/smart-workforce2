import express from 'express';
import { getUsers, getUser, updateUser, deleteUser, createUser, updateProfile, getNextId } from '../controllers/userController.js';
import upload from '../middleware/multerMiddleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, getUsers); // Temporarily remove role check for testing
router.get('/next-id', authenticateToken, getNextId);
router.post('/', authenticateToken, upload.single('profile_picture'), createUser);
router.get('/:id', authenticateToken, getUser);
router.put('/profile', authenticateToken, upload.single('profile_picture'), updateProfile);
router.put('/:id', authenticateToken, upload.single('profile_picture'), updateUser);
router.delete('/:id', authenticateToken, deleteUser);

export default router;