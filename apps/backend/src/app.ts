import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { healthRoutes } from './routes/health.js';
import { syncRoutes } from './routes/sync.js';
import { elderRoutes } from './routes/elders.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: true, // Allow all origins for local dev
  });

  app.register(healthRoutes);
  app.register(syncRoutes);
  app.register(elderRoutes);

  return app;
}
