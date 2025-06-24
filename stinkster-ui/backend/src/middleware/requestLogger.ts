/**
 * Request logging middleware
 */

import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

export function requestLogger(logger: winston.Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Log request
    logger.http(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Capture response
    const originalSend = res.send;
    res.send = function(data: any) {
      res.send = originalSend;
      
      // Log response
      const duration = Date.now() - start;
      logger.http(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('content-length')
      });

      return res.send(data);
    };

    next();
  };
}