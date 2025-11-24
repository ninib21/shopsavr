import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import env from '../config/env';

const prisma = new PrismaClient();

export interface SignupData {
  email: string;
  password: string;
  authMethod?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    authMethod: string;
  };
  token: string;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(userId: string, email: string): string {
  const expiresIn = env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { userId, email },
    env.JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Sign up a new user
 */
export async function signup(data: SignupData): Promise<AuthResult> {
  const { email, password, authMethod = 'email' } = data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      authMethod,
    },
    select: {
      id: true,
      email: true,
      authMethod: true,
      createdAt: true,
    },
  });

  // Generate token
  const token = generateToken(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      authMethod: user.authMethod,
    },
    token,
  };
}

/**
 * Log in an existing user
 */
export async function login(data: LoginData): Promise<AuthResult> {
  const { email, password } = data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user has password (might be OAuth user)
  if (!user.passwordHash) {
    throw new Error('Please sign in with your social account');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      authMethod: user.authMethod,
    },
    token,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      authMethod: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      authMethod: true,
      createdAt: true,
    },
  });
}

