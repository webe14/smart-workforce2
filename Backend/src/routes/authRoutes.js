import express from 'express';
import { register, login } from '../controllers/authController.js';
import { body } from 'express-validator';

const router = express.Router();

router.post('/register', [
  body('full_name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['admin', 'hr', 'employee'])
], register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], login);

export default router;