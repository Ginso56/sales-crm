import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { callLogs, companies, users } from '../db/schema.js';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { writeAuditLog } from '../services/auditService.js';

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

    // Audit: log new call
    const statusLabels: Record<string, string> = {
      answered: 'zdvihnutý', no_answer: 'nezdvihnutý', scheduled: 'naplánovaný', callback: 'spätný hovor',
    };
    let callDesc = `Hovor: ${statusLabels[data.status] || data.status}`;
    if (data.shippingCompany) callDesc += ` | ${data.shippingCompany}`;
    if (data.shipmentCount) callDesc += ` | ${data.shipmentCount} zásielok`;
    if (data.notes) callDesc += ` | ${data.notes}`;
    await writeAuditLog(data.companyId, request.user.userId, 'nový hovor', null, callDesc);

    // If no_answer, set priority_followup on company
    if (data.status === 'no_answer') {
      await db
        .update(companies)
        .set({ priorityFollowup: true, updatedAt: new Date() })
        .where(eq(companies.id, data.companyId));
      await writeAuditLog(data.companyId, request.user.userId, 'prioritný followup', 'nie', 'áno');
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

  fastify.put('/api/calls/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updateSchema = z.object({
      shipmentCount: z.number().int().optional(),
      shipmentDestinations: z.array(z.string()).optional(),
      shippingCompany: z.string().optional(),
      notes: z.string().optional(),
    });
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input' });
    }

    // Fetch existing call
    const existing = await db
      .select({
        id: callLogs.id,
        companyId: callLogs.companyId,
        shipmentCount: callLogs.shipmentCount,
        shipmentDestinations: callLogs.shipmentDestinations,
        shippingCompany: callLogs.shippingCompany,
        notes: callLogs.notes,
      })
      .from(callLogs)
      .where(eq(callLogs.id, id));

    if (!existing[0]) {
      return reply.status(404).send({ error: 'Call not found' });
    }

    const old = existing[0];
    const companyId = old.companyId!;
    const updates: Record<string, unknown> = {};

    // Track changes for audit
    if (parsed.data.notes !== undefined && (old.notes || '') !== parsed.data.notes) {
      updates.notes = parsed.data.notes;
      await writeAuditLog(companyId, request.user.userId, 'poznámka hovoru', old.notes || null, parsed.data.notes || null);
    }
    if (parsed.data.shippingCompany !== undefined && (old.shippingCompany || '') !== parsed.data.shippingCompany) {
      updates.shippingCompany = parsed.data.shippingCompany;
      await writeAuditLog(companyId, request.user.userId, 'prepravca', old.shippingCompany || null, parsed.data.shippingCompany || null);
    }
    if (parsed.data.shipmentCount !== undefined && (old.shipmentCount || 0) !== parsed.data.shipmentCount) {
      updates.shipmentCount = parsed.data.shipmentCount;
      await writeAuditLog(companyId, request.user.userId, 'počet zásielok', String(old.shipmentCount || 0), String(parsed.data.shipmentCount));
    }
    if (parsed.data.shipmentDestinations !== undefined) {
      const oldDest = (old.shipmentDestinations || []).join(', ');
      const newDest = parsed.data.shipmentDestinations.join(', ');
      if (oldDest !== newDest) {
        updates.shipmentDestinations = parsed.data.shipmentDestinations;
        await writeAuditLog(companyId, request.user.userId, 'destinácie', oldDest || null, newDest || null);
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(callLogs).set(updates).where(eq(callLogs.id, id));
    }

    return reply.send({ success: true });
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
