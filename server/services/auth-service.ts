import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from '../storage-sqlite';
import { type User, type InsertUser, type Session, type InsertSession } from '../../shared/schema';

export interface AuthUser {
  id: number;
  username?: string; // Made optional
  email: string;
  name: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar: string;
  learningPace: number;
  studyStreak: number;
  lastActiveDate?: Date;
  lastLoginDate?: Date;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  username?: string; // Made optional
  email: string;
  password: string;
  name: string;
  phone?: string;
  bio?: string;
  location?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

const JWT_SECRET = process.env.JWT_SECRET || 'lightweight-study-app-secret-key';
const JWT_EXPIRES_IN = '7d'; // 7 days
const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare a password with its hash
   */
  private async comparePassword(password: string, hash: string): Promise<boolean> {
    console.log('🔐 comparePassword called with:', { passwordLength: password?.length, hashLength: hash?.length });
    const result = await bcrypt.compare(password, hash);
    console.log('🔐 bcrypt.compare result:', result);
    return result;
  }

  /**
   * Generate a JWT token for a user
   */
  private generateToken(userId: number): string {
    return jwt.sign(
      { userId, type: 'access' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Verify a JWT token
   */
  private verifyJwtToken(token: string): { userId: number; type: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { userId: decoded.userId, type: decoded.type };
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a new user session
   */
  private async createSession(userId: number, token: string): Promise<Session> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const sessionData: InsertSession = {
      userId,
      token,
      expiresAt,
      lastUsedAt: new Date(),
    };

    return await storage.createSession(sessionData);
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    await storage.deleteExpiredSessions(now);
  }

  /**
   * Sign up a new user
   */
  async signup(data: SignupData): Promise<AuthResponse> {
    // Check if user already exists by email
    const existingUserByEmail = await storage.getUserByEmail(data.email);
    if (existingUserByEmail) {
      throw new Error('User with this email already exists');
    }

    // Only check username uniqueness if username is provided
    if (data.username) {
      const existingUserByUsername = await storage.getUserByUsername(data.username);
      if (existingUserByUsername) {
        throw new Error('Username already taken');
      }
    }

    // Hash the password
    const hashedPassword = await this.hashPassword(data.password);

    // Create user data
    const userData: InsertUser = {
      username: data.username || null, // Set to null if not provided
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      bio: data.bio,
      location: data.location,
      avatar: data.name.charAt(0).toUpperCase(),
      learningPace: 45,
      studyStreak: 0,
      isActive: true,
      emailVerified: false,
    };

    // Create the user
    const user = await storage.createUser(userData);

    // Generate token and create session
    const token = this.generateToken(user.id);
    await this.createSession(user.id, token);

    // Update last login date
    await storage.updateUser(user.id, { lastLoginDate: new Date() });

    // Clean up expired sessions
    await this.cleanupExpiredSessions();

    return {
      user: this.sanitizeUser(user),
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
  }

  /**
   * Log in a user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('🔐 Login attempt for email:', credentials.email);
    
    // Find user by email
    const user = await storage.getUserByEmail(credentials.email);
    console.log('👤 User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('❌ User not found for email:', credentials.email);
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User account is deactivated');
      throw new Error('Account is deactivated');
    }

    // Verify password
    console.log('🔑 Verifying password...');
    const isValidPassword = await this.comparePassword(credentials.password, user.password);
    console.log('🔑 Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', user.email);
      throw new Error('Invalid email or password');
    }

    // Generate token and create session
    const token = this.generateToken(user.id);
    await this.createSession(user.id, token);

    // Update last login date
    await storage.updateUser(user.id, { 
      lastLoginDate: new Date(),
      lastActiveDate: new Date()
    });

    // Clean up expired sessions
    await this.cleanupExpiredSessions();

    return {
      user: this.sanitizeUser(user),
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
  }

  /**
   * Log out a user (invalidate session)
   */
  async logout(token: string): Promise<void> {
    await storage.deleteSessionByToken(token);
  }

  /**
   * Verify a user's token and return user data
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    const decoded = this.verifyJwtToken(token);
    if (!decoded) {
      return null;
    }

    // Check if session exists and is valid
    const session = await storage.getSessionByToken(token);
    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    // Get user data
    const user = await storage.getUser(decoded.userId);
    if (!user || !user.isActive) {
      return null;
    }

    // Update session last used
    await storage.updateSession(session.id, { lastUsedAt: new Date() });

    return this.sanitizeUser(user);
  }

  /**
   * Get user by ID (for authenticated requests)
   */
  async getUserById(userId: number): Promise<AuthUser | null> {
    const user = await storage.getUser(userId);
    if (!user || !user.isActive) {
      return null;
    }
    return this.sanitizeUser(user);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: number, updates: Partial<SignupData>): Promise<AuthUser> {
    const updateData: Partial<InsertUser> = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.phone) updateData.phone = updates.phone;
    if (updates.bio) updateData.bio = updates.bio;
    if (updates.location) updateData.location = updates.location;
    
    // Update avatar if name changed
    if (updates.name) {
      updateData.avatar = updates.name.charAt(0).toUpperCase();
    }

    updateData.updatedAt = new Date();

    const updatedUser = await storage.updateUser(userId, updateData);
    return this.sanitizeUser(updatedUser);
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await this.comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await this.hashPassword(newPassword);

    // Update password
    await storage.updateUser(userId, { 
      password: hashedNewPassword,
      updatedAt: new Date()
    });
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: User): AuthUser {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser as AuthUser;
  }
  /**
   * Verify a password against a user's stored password hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    console.log('🔐 verifyPassword called with:', { passwordLength: password?.length, hashLength: hash?.length, hashPrefix: hash?.substring(0, 10) });
    const result = await this.comparePassword(password, hash);
    console.log('🔐 verifyPassword result:', result);
    return result;
  }
}

export const authService = new AuthService();
