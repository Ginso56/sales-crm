import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { companies, companyHistory, users } from '../db/schema.js';
import { eq, ilike, and, or, sql, desc, asc, SQL } from 'drizzle-orm';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { writeAuditLog } from '../services/auditService.js';

const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().max(255).optional(),
  address: z.string().optional(),
  country: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  status: z.enum(['new', 'contacted', 'interested', 'not_interested', 'closed']).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
});

const updateCompanySchema = createCompanySchema.partial();

export async function companyRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // Get distinct filter values for dropdowns
  fastify.get('/api/companies/filters', async (request, reply) => {
    const [industries, countries] = await Promise.all([
      db.selectDistinct({ value: companies.industry })
        .from(companies)
        .where(sql`${companies.industry} IS NOT NULL AND ${companies.industry} != ''`)
        .orderBy(companies.industry),
      db.selectDistinct({ value: companies.country })
        .from(companies)
        .where(sql`${companies.country} IS NOT NULL AND ${companies.country} != ''`)
        .orderBy(companies.country),
    ]);
    return reply.send({
      industries: industries.map(r => r.value).filter(Boolean),
      countries: countries.map(r => r.value).filter(Boolean),
    });
  });

  fastify.get('/api/companies', async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      country?: string;
      industry?: string;
      assignedTo?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(500, Math.max(1, parseInt(query.limit || '100')));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (query.search) {
      const searchTerm = `%${query.search}%`;
      conditions.push(
        or(
          ilike(companies.name, searchTerm),
          ilike(companies.phone, searchTerm),
          ilike(companies.email, searchTerm)
        )!
      );
    }

    if (query.status) {
      conditions.push(eq(companies.status, query.status));
    }

    if (query.country) {
      conditions.push(eq(companies.country, query.country));
    }

    if (query.industry) {
      conditions.push(eq(companies.industry, query.industry));
    }

    if (query.assignedTo) {
      conditions.push(eq(companies.assignedTo, query.assignedTo));
    }

    // Salesman can only see their own assigned companies
    if (request.user.role === 'salesman') {
      conditions.push(eq(companies.assignedTo, request.user.userId));
    }

    // Supervisor can see own team's companies
    if (request.user.role === 'supervisor') {
      const teamMembers = await db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.supervisorId, request.user.userId), eq(users.id, request.user.userId)));
      const teamIds = teamMembers.map(m => m.id);
      if (teamIds.length > 0) {
        conditions.push(sql`${companies.assignedTo} IN (${sql.join(teamIds.map(id => sql`${id}`), sql`, `)})`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn = (() => {
      switch (query.sortBy) {
        case 'name': return companies.name;
        case 'status': return companies.status;
        case 'country': return companies.country;
        case 'industry': return companies.industry;
        case 'createdAt': return companies.createdAt;
        case 'updatedAt': return companies.updatedAt;
        default: return companies.name;
      }
    })();

    const sortFn = query.sortOrder === 'asc' ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: companies.id,
          name: companies.name,
          phone: companies.phone,
          email: companies.email,
          website: companies.website,
          address: companies.address,
          country: companies.country,
          industry: companies.industry,
          status: companies.status,
          assignedTo: companies.assignedTo,
          priorityFollowup: companies.priorityFollowup,
          createdAt: companies.createdAt,
          updatedAt: companies.updatedAt,
          assignedName: users.name,
        })
        .from(companies)
        .leftJoin(users, eq(companies.assignedTo, users.id))
        .where(whereClause)
        .orderBy(sortFn(sortColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(companies)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count || 0;

    return reply.send({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  fastify.post('/api/companies', async (request, reply) => {
    const parsed = createCompanySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const result = await db
      .insert(companies)
      .values(parsed.data)
      .returning();

    return reply.status(201).send(result[0]);
  });

  fastify.get('/api/companies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await db
      .select({
        id: companies.id,
        name: companies.name,
        phone: companies.phone,
        email: companies.email,
        website: companies.website,
        address: companies.address,
        country: companies.country,
        industry: companies.industry,
        status: companies.status,
        assignedTo: companies.assignedTo,
        priorityFollowup: companies.priorityFollowup,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
        assignedName: users.name,
      })
      .from(companies)
      .leftJoin(users, eq(companies.assignedTo, users.id))
      .where(eq(companies.id, id))
      .limit(1);

    if (!result[0]) {
      return reply.status(404).send({ error: 'Company not found' });
    }

    return reply.send(result[0]);
  });

  fastify.put('/api/companies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateCompanySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const existing = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    if (!existing[0]) {
      return reply.status(404).send({ error: 'Company not found' });
    }

    const old = existing[0];
    const updates = parsed.data;

    // Write audit log for each changed field
    const fieldMap: Record<string, keyof typeof old> = {
      name: 'name',
      phone: 'phone',
      email: 'email',
      website: 'website',
      address: 'address',
      country: 'country',
      industry: 'industry',
      status: 'status',
      assignedTo: 'assignedTo',
    };

    for (const [field, dbField] of Object.entries(fieldMap)) {
      if (field in updates) {
        const oldVal = old[dbField] as string | null;
        const newVal = (updates as Record<string, string | null | undefined>)[field] ?? null;
        if (oldVal !== newVal) {
          await writeAuditLog(id, request.user.userId, field, oldVal, newVal);
        }
      }
    }

    if ('priorityFollowup' in (request.body as Record<string, unknown>)) {
      const body = request.body as { priorityFollowup?: boolean };
      if (old.priorityFollowup !== body.priorityFollowup) {
        await writeAuditLog(
          id,
          request.user.userId,
          'priorityFollowup',
          String(old.priorityFollowup),
          String(body.priorityFollowup)
        );
      }
    }

    const result = await db
      .update(companies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();

    return reply.send(result[0]);
  });

  fastify.get('/api/companies/:id/history', async (request, reply) => {
    const { id } = request.params as { id: string };

    const history = await db
      .select({
        id: companyHistory.id,
        companyId: companyHistory.companyId,
        changedBy: companyHistory.changedBy,
        changedByName: users.name,
        fieldName: companyHistory.fieldName,
        oldValue: companyHistory.oldValue,
        newValue: companyHistory.newValue,
        changedAt: companyHistory.changedAt,
      })
      .from(companyHistory)
      .leftJoin(users, eq(companyHistory.changedBy, users.id))
      .where(eq(companyHistory.companyId, id))
      .orderBy(desc(companyHistory.changedAt));

    return reply.send(history);
  });
}
