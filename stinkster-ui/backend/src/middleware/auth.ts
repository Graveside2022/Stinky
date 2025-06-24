/**
 * Authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler.js';

/**
 * API Key authentication middleware
 */
export function apiKeyAuth(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const providedKey = req.header('X-API-Key') || req.query.apiKey;

    if (!providedKey) {
      throw createError('API key required', 401, 'MISSING_API_KEY');
    }

    if (providedKey !== apiKey) {
      throw createError('Invalid API key', 401, 'INVALID_API_KEY');
    }

    next();
  };
}

/**
 * Bearer token authentication middleware (for future use)
 */
export function bearerAuth(validateToken: (token: string) => Promise<any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Bearer token required', 401, 'MISSING_TOKEN');
    }

    const token = authHeader.substring(7);

    try {
      const user = await validateToken(token);
      (req as any).user = user;
      next();
    } catch (error) {
      throw createError('Invalid token', 401, 'INVALID_TOKEN');
    }
  };
}