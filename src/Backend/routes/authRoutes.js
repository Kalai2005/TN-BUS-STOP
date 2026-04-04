import express from 'express';
import { authService } from '../authService.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    const result = await authService.register({
      email,
      password,
      name,
      phone,
      role,
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await authService.login({ email, password });
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

// Google login endpoint
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Google token is required' });
    }

    const result = await authService.loginWithGoogle({ idToken });
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.userId);
    res.json(user);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const result = await authService.updateUserProfile(req.userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const result = await authService.changePassword(req.userId, {
      currentPassword,
      newPassword,
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Logout endpoint
router.post('/logout', verifyToken, async (req, res) => {
  try {
    await authService.logout(req.userId);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
