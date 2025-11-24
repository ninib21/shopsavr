import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { signup, login, getUserById } from '../../services/authService';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  authMethod: z.string().optional().default('email'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = signupSchema.parse(req.body);

    // Sign up user
    const result = await signup(validatedData);

    res.status(201).json({
      success: true,
      data: result,
      message: 'User created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }

    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);

    // Login user
    const result = await login(validatedData);

    res.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const user = await getUserById(req.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
});

export default router;

