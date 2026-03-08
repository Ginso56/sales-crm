import './env.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth.js';
import { companyRoutes } from './routes/companies.js';
import { callRoutes } from './routes/calls.js';
import { noteRoutes } from './routes/notes.js';
import { calendarRoutes } from './routes/calendar.js';
import { statsRoutes } from './routes/stats.js';
import { goalRoutes } from './routes/goals.js';
import { userRoutes } from './routes/users.js';
import { importRoutes } from './routes/import.js';

const PORT = parseInt(process.env.PORT || '3000');

async function start() {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    credentials: true,
  });

  await fastify.register(cookie);
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(companyRoutes);
  await fastify.register(callRoutes);
  await fastify.register(noteRoutes);
  await fastify.register(calendarRoutes);
  await fastify.register(statsRoutes);
  await fastify.register(goalRoutes);
  await fastify.register(userRoutes);
  await fastify.register(importRoutes);

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal Server Error',
    });
  });

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
