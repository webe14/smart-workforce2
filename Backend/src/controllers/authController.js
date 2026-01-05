import User from '../models/User.js';
import AuditLog from '../models/AuditLogs.js';

const register = async (req, res) => {
  try {
    const { full_name, email, password, role, department, phone_number } = req.body;
    // Store password in plain text (insecure - for demo only)
    const userId = await User.create({ full_name, email, password, role, department, phone_number });
    await AuditLog.create({ user_id: req.user?.id, action: 'Register User', entity: 'users', entity_id: userId, ip_address: req.ip });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    // Simple plain text password comparison (insecure - for demo only)
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    await AuditLog.create({ user_id: user.user_id, action: 'Login', entity: 'users', entity_id: user.user_id, ip_address: req.ip });
    // Return user data without token
    res.json({
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        role: user.role,
        email: user.email,
        profile_picture: user.profile_picture
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { register, login };