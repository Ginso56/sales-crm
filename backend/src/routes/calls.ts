import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { callLogs, companies, users } from '../db/schema.js';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { authMiddleware } from '../middleware/authMiddleware.js';

const callLogSchema = z.object({
  companyId: z.string().uuid(),
  status: z.enum(['answered', 'no_answer', 'scheduled', 'callback']),
  calledAt: z.string().datetime().optional(),
  scheduledFor: z.string().datetime().optional(),
  durationSeconds: z.number().int().optional(),
  shipmentCount: z.number().int().optional(),
  shipmentDestinations: z.array(z.string()).optional(),
  shippingCompany: z.string().optional(),
  notes: z.string().optional(),
});

export async function callRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  fastify.post('/api/calls/log', async (request, reply) => {
    const parsed = callLogSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const data = parsed.data;

    const result = await db
      .insert(callLogs)
      .values({
        companyId: data.companyId,
        salesmanId: request.user.userId,
        status: data.status,
        calledAt: data.calledAt ? new Date(data.calledAt) : new Date(),
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        durationSeconds: data.durationSeconds,
        shipmentCount: data.shipmentCount,
        shipmentDestinations: data.shipmentDestinations,
        shippingCompany: data.shippingCompany,
        notes: data.notes,
      })
      .returning();

    // If no_answer, set priority_followup on company
    if (data.status === 'no_answer') {
      await db
        .update(companies)
        .set({ priorityFollowup: true, updatedAt: new Date() })
        .where(eq(companies.id, data.companyId));
    }

    // If answered, update company status to contacted if still new
    if (data.status === 'answered') {
      await db
        .update(companies)
        .set({ updatedAt: new Date() })
        .where(eq(companies.id, data.companyId));
    }

    return reply.status(201).send(result[0]);
  });

  fastify.get('/api/calls/:companyId', async (request, reply) => {
    const { companyId } = request.params as { companyId: string };

    const logs = await db
      .select({
        id: callLogs.id,
        companyId: callLogs.companyId,
        salesmanId: callLogs.salesmanId,
        salesmanName: users.name,
        status: callLogs.status,
        calledAt: callLogs.calledAt,
        scheduledFor: callLogs.scheduledFor,
        durationSeconds: callLogs.durationSeconds,
        shipmentCount: callLogs.shipmentCount,
        shipmentDestinations: callLogs.shipmentDestinations,
        shippingCompany: callLogs.shippingCompany,
        notes: callLogs.notes,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .leftJoin(users, eq(callLogs.salesmanId, users.id))
      .where(eq(callLogs.companyId, companyId))
      .orderBy(desc(callLogs.createdAt));

    return reply.send(logs);
  });

  fastify.get('/api/calls/today/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const logs = await db
      .select({
        id: callLogs.id,
        companyId: callLogs.companyId,
        companyName: companies.name,
        companyPhone: companies.phone,
        status: callLogs.status,
        calledAt: callLogs.calledAt,
        shipmentCount: callLogs.shipmentCount,
        shippingCompany: callLogs.shippingCompany,
        notes: callLogs.notes,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .leftJoin(companies, eq(callLogs.companyId, companies.id))
      .where(
        and(
          eq(callLogs.salesmanId, userId),
          gte(callLogs.calledAt, todayStart),
          lte(callLogs.calledAt, todayEnd)
        )
      )
      .orderBy(desc(callLogs.calledAt));

    return reply.send(logs);
  });
}
