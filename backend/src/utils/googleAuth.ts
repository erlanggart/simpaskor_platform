/**
 * Google OAuth Configuration and Utilities
 * 
 * This utility handles Google OAuth authentication by verifying Google ID tokens
 * and creating/authenticating users in the database.
 */

import axios from 'axios';
import { prisma } from '../lib/prisma';
import { AuthUtils } from './auth';
import { UserRole, UserStatus } from '@prisma/client';

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
  sub: string; // Google user ID
}

export class GoogleAuthUtils {
  /**
   * Verify Google ID token and get user information
   * @param token - Google ID token from frontend
   * @returns User information from Google
   */
  static async verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
    try {
      // Verify token with Google's tokeninfo endpoint
      const response = await axios.get<GoogleUserInfo>(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
      );

      return response.data;
    } catch (error: any) {
      console.error('Google token verification failed:', error.response?.data || error.message);
      throw new Error('Invalid Google token');
    }
  }

  /**
   * Find or create user from Google authentication
   * @param googleUser - Google user information
   * @returns User from database with token
   */
  static async findOrCreateGoogleUser(googleUser: GoogleUserInfo) {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
      include: { profile: true },
    });

    if (user) {
      // User exists - update last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLogin: new Date(),
          emailVerified: googleUser.email_verified, // Update email verification status
        },
        include: { profile: true },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          passwordHash: '', // No password for Google OAuth users
          role: UserRole.PESERTA, // Default role for Google sign-up
          status: UserStatus.ACTIVE, // Active immediately for Google users
          emailVerified: googleUser.email_verified,
          profile: {
            create: {
              avatar: googleUser.picture,
            },
          },
        },
        include: { profile: true },
      });
    }

    // Generate JWT token
    const token = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return {
      user: AuthUtils.sanitizeUser(user),
      token,
    };
  }
}
