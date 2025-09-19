import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth-service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    name: string;
    avatar: string;
    learningPace: number;
    studyStreak: number;
    isActive: boolean;
    emailVerified: boolean;
    phone?: string;
    bio?: string;
    location?: string;
    lastLoginDate?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Middleware to authenticate requests and attach user to request object
 */
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const user = await authService.verifyToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const user = await authService.verifyToken(token);
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
  }
  
  next();
}
