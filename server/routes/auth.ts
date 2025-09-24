import { Router } from 'express';
import { authService } from '../services/auth-service';
import { emailService } from '../services/email-service';
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

    // Validate required fields - username is now optional
    if (!email || !password || !name) {
      return res.status(400).json({ 
        message: 'Email, password, and name are required' 
      });
    }

    // Validate email format - Gmail only
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      return res.status(400).json({ message: 'Only Gmail addresses are allowed' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ 
        message: 'Password must contain at least one uppercase letter' 
      });
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ 
        message: 'Password must contain at least one lowercase letter' 
      });
    }

    // Check for number
    if (!/\d/.test(password)) {
      return res.status(400).json({ 
        message: 'Password must contain at least one number' 
      });
    }

    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return res.status(400).json({ 
        message: 'Password must contain at least one special character' 
      });
    }

    // Validate username format only if provided
    if (username && (username.length < 3 || username.length > 20)) {
      return res.status(400).json({ 
        message: 'Username must be between 3 and 20 characters' 
      });
    }

    const signupData = {
      username, // Can be undefined
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

/**
 * GET /api/auth/check-email
 * Check if email is available (Gmail only)
 */
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate Gmail format
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Only Gmail addresses are allowed',
        available: false
      });
    }

    // Check if email is already taken
    const isTaken = await emailService.isEmailTaken(email);
    
    res.json({
      available: !isTaken,
      message: isTaken ? 'Email is already registered' : 'Email is available'
    });
  } catch (error: any) {
    console.error('Email check error:', error);
    res.status(500).json({ message: 'Failed to check email availability' });
  }
});

/**
 * POST /api/auth/send-otp
 * Send OTP to email for verification
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: 'Email and name are required' });
    }

    // Validate Gmail format
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      return res.status(400).json({ message: 'Only Gmail addresses are allowed' });
    }

    // Check if email is already taken
    const isTaken = await emailService.isEmailTaken(email);
    if (isTaken) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Generate and send OTP
    const otp = emailService.generateOTP();
    const emailSent = await emailService.sendOTPEmail(email, otp);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }

    // Store OTP
    await emailService.storeOTP(email, otp);

    res.json({ 
      message: 'OTP sent successfully',
      email: email // Return email for the next step
    });
  } catch (error: any) {
    console.error('OTP send error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and create account
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, name, password } = req.body;

    if (!email || !otp || !name || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Verify OTP
    const otpResult = await emailService.verifyOTP(email, otp);
    if (!otpResult.success) {
      return res.status(400).json({ message: otpResult.message });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one lowercase letter' });
    }

    if (!/\d/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one number' });
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one special character' });
    }

    // Create user account
    const authResult = await authService.signup({
      email,
      password,
      name
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(email, name);

    res.json({
      message: 'Account created successfully',
      user: authResult.user,
      token: authResult.token
    });
  } catch (error: any) {
    console.error('OTP verification error:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP to email
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate Gmail format
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      return res.status(400).json({ message: 'Only Gmail addresses are allowed' });
    }

    // Check if email is already taken
    const isTaken = await emailService.isEmailTaken(email);
    if (isTaken) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Generate and send new OTP
    const otp = emailService.generateOTP();
    const emailSent = await emailService.sendOTPEmail(email, otp);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to resend OTP email' });
    }

    // Store new OTP (this will overwrite the old one)
    await emailService.storeOTP(email, otp);

    res.json({ 
      message: 'OTP resent successfully'
    });
  } catch (error: any) {
    console.error('OTP resend error:', error);
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
});

// Password verification endpoint for profile editing
router.post('/verify-password', authenticateToken, async (req: any, res: any) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    console.log('🔐 Password verification attempt:', { userId, passwordLength: password?.length });

    if (!password) {
      console.log('❌ No password provided');
      return res.status(400).json({ message: 'Password is required' });
    }

    // Get the user from database
    const user = await storage.getUser(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('👤 User found:', { id: user.id, email: user.email });

    // Verify the password
    console.log('🔍 Calling verifyPassword with:', { passwordLength: password.length, hashLength: user.password?.length });
    const isPasswordValid = await authService.verifyPassword(password, user.password);
    console.log('✅ Password verification result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ message: 'Invalid password' });
    }

    console.log('✅ Password verified successfully');
    res.json({ message: 'Password verified successfully' });
  } catch (error: any) {
    console.error('❌ Password verification error:', error);
    res.status(500).json({ 
      message: 'Password verification failed', 
      error: error.message 
    });
  }
});

// Data export endpoint
router.post('/export-data', authenticateToken, async (req: any, res: any) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    console.log('📊 Data export request:', { userId, passwordLength: password?.length });

    if (!password) {
      console.log('❌ No password provided for data export');
      return res.status(400).json({ message: 'Password is required' });
    }

    // Get the user from database
    const user = await storage.getUser(userId);
    if (!user) {
      console.log('❌ User not found for data export:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('👤 User found for data export:', { id: user.id, email: user.email });

    // Verify the password
    console.log('🔍 Verifying password for data export');
    const isPasswordValid = await authService.verifyPassword(password, user.password);
    console.log('✅ Password verification result for data export:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for data export');
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate user data export
    console.log('📦 Generating data export for user:', userId);
    const userData = {
      profile: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
        avatar: user.avatar,
        profileImagePath: user.profileImagePath,
        learningPace: user.learningPace,
        studyStreak: user.studyStreak,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      // Add other user data like documents, units, progress, etc.
      documents: await storage.getUserDocuments(userId),
      units: await storage.getUserUnits(userId),
      progress: await storage.getUserProgress(userId),
      friends: await storage.getUserFriends(userId),
      notifications: await storage.getNotifications(userId, 100), // Last 100 notifications
      exportDate: new Date().toISOString(),
    };

    // Send email with data export
    console.log('📧 Sending data export email to:', user.email);
    const emailSent = await emailService.sendDataExportEmail(user.email, userData, user.name);
    
    if (emailSent) {
      console.log('✅ Data export email sent successfully');
      res.json({ 
        message: 'Data export sent successfully to your email address',
        email: user.email 
      });
    } else {
      console.log('❌ Failed to send data export email');
      res.status(500).json({ message: 'Failed to send data export email' });
    }
  } catch (error: any) {
    console.error('❌ Data export error:', error);
    res.status(500).json({ 
      message: 'Data export failed', 
      error: error.message 
    });
  }
});

// Change password endpoint
router.post('/change-password', authenticateToken, async (req: any, res: any) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log('🔐 Password change request:', { userId, currentPasswordLength: currentPassword?.length, newPasswordLength: newPassword?.length });

    if (!currentPassword || !newPassword) {
      console.log('❌ Missing password fields');
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Debug: Log the actual password and test each requirement
    console.log('🔍 Backend password validation:', {
      newPassword: newPassword, // Log the actual password for debugging
      length: newPassword.length,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)
    });

    // Validate new password strength (matching frontend requirements)
    // Use individual checks instead of complex regex to match frontend exactly
    if (newPassword.length < 8) {
      console.log('❌ Password too short');
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters long' 
      });
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      console.log('❌ Missing uppercase');
      return res.status(400).json({ 
        message: 'New password must contain at least one uppercase letter' 
      });
    }
    
    if (!/[a-z]/.test(newPassword)) {
      console.log('❌ Missing lowercase');
      return res.status(400).json({ 
        message: 'New password must contain at least one lowercase letter' 
      });
    }
    
    if (!/\d/.test(newPassword)) {
      console.log('❌ Missing number');
      return res.status(400).json({ 
        message: 'New password must contain at least one number' 
      });
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      console.log('❌ Missing special character');
      return res.status(400).json({ 
        message: 'New password must contain at least one special character' 
      });
    }
    
    console.log('✅ All password requirements met');

    // Get the user from database
    const user = await storage.getUser(userId);
    if (!user) {
      console.log('❌ User not found for password change:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('👤 User found for password change:', { id: user.id, email: user.email });

    // Verify the current password
    console.log('🔍 Verifying current password');
    const isCurrentPasswordValid = await authService.verifyPassword(currentPassword, user.password);
    console.log('✅ Current password verification result:', isCurrentPasswordValid);
    
    if (!isCurrentPasswordValid) {
      console.log('❌ Invalid current password');
      return res.status(401).json({ message: 'Invalid current password' });
    }

    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      console.log('❌ New password is the same as current password');
      return res.status(400).json({ message: 'New password must be different from your current password' });
    }

    // Hash the new password
    console.log('🔐 Hashing new password');
    const hashedNewPassword = await authService.hashPassword(newPassword);

    // Update the user's password in the database
    console.log('💾 Updating user password in database');
    await storage.updateUserPassword(userId, hashedNewPassword);
    
    console.log('✅ Password changed successfully');
    res.json({ 
      message: 'Password changed successfully' 
    });
  } catch (error: any) {
    console.error('❌ Password change error:', error);
    res.status(500).json({ 
      message: 'Password change failed', 
      error: error.message 
    });
  }
});

// Account deletion endpoint
router.delete('/account', authenticateToken, async (req: any, res: any) => {
  try {
    const { password, confirmation } = req.body;
    const userId = req.user.id;

    console.log('🗑️ Account deletion request:', { userId, passwordLength: password?.length, confirmation });

    if (!password) {
      console.log('❌ No password provided for account deletion');
      return res.status(400).json({ message: 'Password is required' });
    }

    if (!confirmation) {
      console.log('❌ No confirmation provided for account deletion');
      return res.status(400).json({ message: 'Confirmation is required' });
    }

    if (confirmation !== 'Delete') {
      console.log('❌ Invalid confirmation for account deletion:', confirmation);
      return res.status(400).json({ message: 'Confirmation must be exactly "Delete"' });
    }

    // Get the user from database
    const user = await storage.getUser(userId);
    if (!user) {
      console.log('❌ User not found for account deletion:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('👤 User found for account deletion:', { id: user.id, email: user.email });

    // Verify the password
    console.log('🔍 Verifying password for account deletion');
    const isPasswordValid = await authService.verifyPassword(password, user.password);
    console.log('✅ Password verification result for account deletion:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for account deletion');
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Delete user account and all associated data
    console.log('🗑️ Deleting user account and all data:', userId);
    await storage.deleteUserAccount(userId);
    
    console.log('✅ User account deleted successfully');
    res.json({ 
      message: 'Account deleted successfully',
      email: user.email 
    });
  } catch (error: any) {
    console.error('❌ Account deletion error:', error);
    res.status(500).json({ 
      message: 'Account deletion failed', 
      error: error.message 
    });
  }
});

export default router;
