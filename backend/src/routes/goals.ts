import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { goals } from '../db/schema.js';
import { eq, and, lte, gte } from 'drizzle-orm';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleGuard } from '../middleware/roleGuard.js';

const goalSchema = z.object({
  userId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  targetCalls: z.number().int().min(0),
  targetNewClients: z.number().int().min(0),
  targetShipments: z.number().int().min(0),
});

export async function goalRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/goals/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    if (request.user.role === 'salesman' && request.user.userId !== userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const now = new Date().toISOString().split('T')[0];
    const result = await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.userId, userId),
          lte(goals.periodStart, now),
          gte(goals.periodEnd, now)
        )
      );

    return reply.send(result);
  });

  fastify.post('/api/goals', async (request, reply) => {
    const preHandler = roleGuard('admin', 'supervisor');
    await preHandler(request, reply);
    if (reply.sent) return;

    const parsed = goalSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const result = await db
      .insert(goals)
      .values({
        userId: parsed.data.userId,
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        targetCalls: parsed.data.targetCalls,
        targetNewClients: parsed.data.targetNewClients,
        targetShipments: parsed.data.targetShipments,
        createdBy: request.user.userId,
      })
      .returning();

    return reply.status(201).send(result[0]);
  });

  fastify.put('/api/goals/:id', async (request, reply) => {
    const preHandler = roleGuard('admin', 'supervisor');
    await preHandler(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };
    const parsed = goalSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const result = await db
      .update(goals)
      .set(parsed.data)
      .where(eq(goals.id, id))
      .returning();

    if (!result[0]) {
      return reply.status(404).send({ error: 'Goal not found' });
    }

    return reply.send(result[0]);
  });
}
