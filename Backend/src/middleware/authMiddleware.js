// Simplified middleware - no token authentication
// This is insecure and for demo purposes only
const authenticateToken = (req, res, next) => {
  // Bypass authentication, trust headers from frontend
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (userId && userRole) {
    req.user = {
      id: userId,
      role: userRole
    };
  }

  next();
};

export { authenticateToken };