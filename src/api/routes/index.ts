/**
 * API Routes Index
 */

import { Router } from 'express';
import pipelineRoutes from './pipeline.routes';
import dmoRoutes from './dmo.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount route modules
router.use('/pipeline', pipelineRoutes);
router.use('/dmo', dmoRoutes);

export default router;
