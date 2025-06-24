/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import type { ApiResponse } from '../types/index.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(logger: winston.Logger) {
  return (err: AppError, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    logger.error('Error occurred:', {
      error: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      code: err.code,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      ip: req.ip
    });

    // Determine status code
    const statusCode = err.statusCode || 500;

    // Create error response
    const response: ApiResponse = {
      success: false,
      error: err.message || 'Internal server error',
      timestamp: Date.now()
    };

    // Add error code if available
    if (err.code) {
      (response as any).code = err.code;
    }

    // Add details in development mode
    if (process.env.NODE_ENV === 'development' && err.details) {
      (response as any).details = err.details;
      (response as any).stack = err.stack;
    }

    res.status(statusCode).json(response);
  };
}

/**
 * Create custom error
 */
export function createError(message: string, statusCode: number = 500, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}