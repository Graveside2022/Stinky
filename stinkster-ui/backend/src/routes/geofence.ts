/**
 * Geofence API Routes
 */

import { Router } from 'express';
import winston from 'winston';

export function createGeofenceRouter(logger: winston.Logger): Router {
  const router = Router();

  // GET /api/geofences
  router.get('/', (req, res) => {
    res.json({ success: true, data: [], timestamp: Date.now() });
  });

  // POST /api/geofences
  router.post('/', (req, res) => {
    res.json({ success: true, data: { id: 'geofence-1' }, timestamp: Date.now() });
  });

  // PATCH /api/geofences/:id
  router.patch('/:id', (req, res) => {
    res.json({ success: true, data: { updated: true }, timestamp: Date.now() });
  });

  // DELETE /api/geofences/:id
  router.delete('/:id', (req, res) => {
    res.json({ success: true, data: { deleted: true }, timestamp: Date.now() });
  });

  return router;
}