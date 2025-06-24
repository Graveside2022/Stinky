/**
 * Antenna Configuration API Routes
 */

import { Router } from 'express';
import type { WigleToTakCore } from '../services/wigleToTakCore.js';
import winston from 'winston';

export function createAntennaRouter(wigleCore: WigleToTakCore, logger: winston.Logger): Router {
  const router = Router();

  // GET /api/antenna/config
  router.get('/config', (req, res) => {
    const config = wigleCore.getConfig();
    res.json({ success: true, data: config.antenna, timestamp: Date.now() });
  });

  // POST /api/antenna/config
  router.post('/config', (req, res) => {
    const currentConfig = wigleCore.getConfig();
    wigleCore.updateConfig({
      ...currentConfig,
      antenna: { ...currentConfig.antenna, ...req.body }
    });
    res.json({ success: true, data: wigleCore.getConfig().antenna, timestamp: Date.now() });
  });

  return router;
}