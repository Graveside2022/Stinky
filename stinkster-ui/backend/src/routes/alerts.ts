/**
 * Alert API Routes
 */

import { Router } from 'express';
import winston from 'winston';

export function createAlertRouter(logger: winston.Logger): Router {
  const router = Router();

  // GET /api/alerts
  router.get('/', (req, res) => {
    res.json({ success: true, data: [], timestamp: Date.now() });
  });

  // POST /api/alerts/:id/read
  router.post('/:id/read', (req, res) => {
    res.json({ success: true, data: { read: true }, timestamp: Date.now() });
  });

  // POST /api/alerts/clear
  router.post('/clear', (req, res) => {
    res.json({ success: true, data: { cleared: 0 }, timestamp: Date.now() });
  });

  return router;
}