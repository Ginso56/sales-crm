import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { scheduledCalls, companies, users } from '../db/schema.js';
import { eq, and, gte, lte, or, sql, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { writeAuditLog } from '../services/auditService.js';

const scheduleSchema = z.object({
  companyId: z.string().uuid(),
  assignedTo: z.string().uuid(),
  scheduledFor: z.string().datetime(),
  title: z.string().min(1).max(255),
});

const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'done', 'cancelled']),
});

export async function calendarRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/calendar/scheduled', async (request, reply) => {
    const query = request.query as { start?: string; end?: string };
    const conditions = [];

    if (query.start) {
      conditions.push(gte(scheduledCalls.scheduledFor, new Date(query.start)));
    }
    if (query.end) {
      conditions.push(lte(scheduledCalls.scheduledFor, new Date(query.end)));
    }

    // Role-based filtering
    if (request.user.role === 'salesman') {
      conditions.push(eq(scheduledCalls.assignedTo, request.user.userId));
    } else if (request.user.role === 'supervisor') {
      const teamMembers = await db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.supervisorId, request.user.userId), eq(users.id, request.user.userId)));
      const teamIds = teamMembers.map(m => m.id);
      if (teamIds.length > 0) {
        conditions.push(
          sql`${scheduledCalls.assignedTo} IN (${sql.join(teamIds.map(id => sql`${id}`), sql`, `)})`
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        id: scheduledCalls.id,
        companyId: scheduledCalls.companyId,
        companyName: companies.name,
        companyPhone: companies.phone,
        assignedTo: scheduledCalls.assignedTo,
        assignedToName: users.name,
        scheduledBy: scheduledCalls.scheduledBy,
        scheduledFor: scheduledCalls.scheduledFor,
        title: scheduledCalls.title,
        status: scheduledCalls.status,
        createdAt: scheduledCalls.createdAt,
      })
      .from(scheduledCalls)
      .leftJoin(companies, eq(scheduledCalls.companyId, companies.id))
      .leftJoin(users, eq(scheduledCalls.assignedTo, users.id))
      .where(whereClause)
      .orderBy(desc(scheduledCalls.scheduledFor));

    return reply.send(result);
  });

  fastify.post('/api/calendar/schedule', async (request, reply) => {
    const parsed = scheduleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    // Salesman can only assign to self
    if (request.user.role === 'salesman' && parsed.data.assignedTo !== request.user.userId) {
      return reply.status(403).send({ error: 'Salesman can only schedule calls for themselves' });
    }

    const result = await db
      .insert(scheduledCalls)
      .values({
        companyId: parsed.data.companyId,
        assignedTo: parsed.data.assignedTo,
        scheduledBy: request.user.userId,
        scheduledFor: new Date(parsed.data.scheduledFor),
        title: parsed.data.title,
      })
      .returning();

    const scheduledDate = new Date(parsed.data.scheduledFor).toLocaleString('sk-SK');
    await writeAuditLog(parsed.data.companyId, request.user.userId, 'naplánovaný hovor', null, `${parsed.data.title} (${scheduledDate})`);

    return reply.status(201).send(result[0]);
  });

  fastify.put('/api/calendar/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = statusUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    // Fetch existing to get old status and companyId
    const existing = await db
      .select({ companyId: scheduledCalls.companyId, status: scheduledCalls.status, title: scheduledCalls.title })
      .from(scheduledCalls)
      .where(eq(scheduledCalls.id, id));

    const result = await db
      .update(scheduledCalls)
      .set({ status: parsed.data.status })
      .where(eq(scheduledCalls.id, id))
      .returning();

    if (!result[0]) {
      return reply.status(404).send({ error: 'Scheduled call not found' });
    }

    if (existing[0]?.companyId) {
      const statusLabels: Record<string, string> = { pending: 'čaká', done: 'dokončený', cancelled: 'zrušený' };
      await writeAuditLog(
        existing[0].companyId,
        request.user.userId,
        `plán. hovor: ${existing[0].title || ''}`,
        statusLabels[existing[0].status || 'pending'] || existing[0].status || '',
        statusLabels[parsed.data.status] || parsed.data.status,
      );
    }

    return reply.send(result[0]);
  });
}
