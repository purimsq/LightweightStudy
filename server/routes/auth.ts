import { Router } from 'express';
import { authService } from '../services/auth-service';
import { storage } from '../storage-sqlite';

const router = Router();

/**
 * Middleware to extract and verify JWT token
 */
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const user = await authService.verifyToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, name, phone, bio, location } = req.body;

    // Validate required fields
    if (!username || !email || !password || !name) {
      return res.status(400).json({ 
        message: 'Username, email, password, and name are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Validate username format
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ 
        message: 'Username must be between 3 and 20 characters' 
      });
    }

    const signupData = {
      username,
      email,
      password,
      name,
      phone,
      bio,
      location,
    };

    const result = await authService.signup(signupData);

    res.status(201).json({
      message: 'Account created successfully',
      user: result.user,
      token: result.token,
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    const result = await authService.login({ email, password });

    res.json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ message: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await authService.logout(token);
    }

    res.json({ message: 'Logout successful' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

/**
 * GET /api/auth/verify
 * Verify token and return user data
 */
router.get('/verify', authenticateToken, async (req: any, res) => {
  try {
    res.json({
      message: 'Token is valid',
      user: req.user,
    });
  } catch (error: any) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Token verification failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user data' });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, async (req: any, res) => {
  try {
    const { name, phone, bio, location } = req.body;
    const userId = req.user.id;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;

    const updatedUser = await authService.updateUserProfile(userId, updates);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put('/change-password', authenticateToken, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'New password must be at least 6 characters long' 
      });
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Password change error:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * DELETE /api/auth/account
 * Delete user account
 */
router.delete('/account', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // In a real app, you might want to soft delete or archive the user
    // For now, we'll just deactivate the account
    await storage.updateUser(userId, { 
      isActive: false,
      updatedAt: new Date()
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

export default router;
