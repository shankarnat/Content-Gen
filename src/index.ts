/**
 * Content Foundry - Main Application Entry Point
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import apiRoutes from './api/routes';
import { errorHandler, notFoundHandler, requestLogger } from './api/middleware';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Serve static files (playground UI)
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', apiRoutes);

// Serve playground UI for root and any non-API routes
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Content Foundry server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
  });

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🧪 Content Foundry - Generative Data Pipeline           ║
║                                                           ║
║   Server running at: http://localhost:${PORT}              ║
║   API endpoint:      http://localhost:${PORT}/api          ║
║   Playground UI:     http://localhost:${PORT}              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
