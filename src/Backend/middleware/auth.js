import jwt from 'jsonwebtoken';

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check admin role
export const isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// Middleware to check conductor role
export const isConductor = (req, res, next) => {
  if (req.userRole !== 'conductor' && req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Conductor role required.' });
  }
  next();
};

// Generate JWT token
export const generateToken = (userId, role) => {
  const token = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'your_default_secret',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
  return token;
};

// Generate Refresh token
export const generateRefreshToken = (userId, role) => {
  const refreshToken = jwt.sign(
    { userId, role, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'your_default_refresh_secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
  return refreshToken;
};
