import User from './models/User.js';
import { generateToken, generateRefreshToken } from './middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const googleClient = new OAuth2Client();

const buildAuthResponse = (user, token, refreshToken) => ({
  success: true,
  user: {
    id: user._id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    profilePicture: user.profilePicture || null,
  },
  token,
  refreshToken,
});

export const authService = {
  // Register a new user
  register: async (userData) => {
    try {
      const { email, password, name, phone, role = 'passenger' } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists with that email');
      }

      // Create new user
      const user = new User({
        email,
        password,
        name,
        phone,
        role,
      });

      await user.save();

      // Generate tokens
      const token = generateToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id, user.role);

      return buildAuthResponse(user, token, refreshToken);
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      const { email, password } = credentials;

      // Find user and select password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('User account is disabled');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const token = generateToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id, user.role);

      return buildAuthResponse(user, token, refreshToken);
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  },

  loginWithGoogle: async (googleData) => {
    try {
      const { idToken } = googleData;
      if (!idToken) {
        throw new Error('Google token is required');
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
        throw new Error('Server configuration error: GOOGLE_CLIENT_ID not set. Add it to .env file from Google Cloud Console.');
      }

      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken,
          audience: clientId,
        });
      } catch (verifyErr) {
        const errMsg = String(verifyErr?.message || '').toLowerCase();
        if (errMsg.includes('invalid token') || errMsg.includes('malformed')) {
          throw new Error('Invalid or expired Google token. Token may be expired—please try signing in again.');
        }
        if (errMsg.includes('audience mismatch') || errMsg.includes('not audience') || errMsg.includes('aud')) {
          throw new Error(`Google Client ID mismatch. Ensure GOOGLE_CLIENT_ID in .env exactly matches Google Cloud Console credentials. Current ID: ${clientId}`);
        }
        throw new Error(`Google token verification failed: ${verifyErr.message}`);
      }

      const payload = ticket.getPayload();
      const email = String(payload?.email || '').toLowerCase().trim();
      const name = String(payload?.name || 'Google User').trim();
      const googleId = String(payload?.sub || '').trim();
      const picture = payload?.picture || null;
      const isEmailVerified = Boolean(payload?.email_verified);

      if (!email || !googleId || !isEmailVerified) {
        throw new Error('Invalid Google account details');
      }

      let user = await User.findOne({ email }).select('+password');

      if (!user) {
        user = new User({
          email,
          password: crypto.randomBytes(24).toString('hex'),
          name,
          role: 'passenger',
          profilePicture: picture,
          googleId,
        });
      } else {
        user.googleId = user.googleId || googleId;
        if (!user.profilePicture && picture) {
          user.profilePicture = picture;
        }
      }

      if (!user.isActive) {
        throw new Error('User account is disabled');
      }

      user.lastLogin = new Date();
      await user.save();

      const token = generateToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id, user.role);
      return buildAuthResponse(user, token, refreshToken);
    } catch (error) {
      console.error('Google login error:', error.message);
      throw new Error(`Google login failed: ${error.message}`);
    }
  },

  // Get user profile
  getUserProfile: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      };
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  },

  // Update user profile
  updateUserProfile: async (userId, updateData) => {
    try {
      const allowedUpdates = ['name', 'phone', 'profilePicture'];
      const updates = {};

      allowedUpdates.forEach((field) => {
        if (updateData[field]) {
          updates[field] = updateData[field];
        }
      });

      const user = await User.findByIdAndUpdate(userId, updates, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      };
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  },

  // Change password
  changePassword: async (userId, passwordData) => {
    try {
      const { currentPassword, newPassword } = passwordData;

      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  },

  // Logout (optional - client-side should handle token removal)
  logout: async (userId) => {
    try {
      // Update last login for analytics
      await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  },
};

export const bookingService = {
  // Booking services will be implemented
};
