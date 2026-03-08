import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleGuard } from '../middleware/roleGuard.js';

const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'supervisor', 'salesman']),
  supervisorId: z.string().uuid().optional().nullable(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'supervisor', 'salesman']).optional(),
  supervisorId: z.string().uuid().optional().nullable(),
});

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/users', async (request, reply) => {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        supervisorId: users.supervisorId,
        createdAt: users.createdAt,
      })
      .from(users);

    return reply.send(result);
  });

  fastify.post('/api/users', async (request, reply) => {
    const preHandler = roleGuard('admin', 'supervisor');
    await preHandler(request, reply);
    if (reply.sent) return;

    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    try {
      const result = await db
        .insert(users)
        .values({
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          role: parsed.data.role,
          supervisorId: parsed.data.supervisorId,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          supervisorId: users.supervisorId,
          createdAt: users.createdAt,
        });

      return reply.status(201).send(result[0]);
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        return reply.status(409).send({ error: 'Email already exists' });
      }
      throw error;
    }
  });

  fastify.put('/api/users/:id', async (request, reply) => {
    const preHandler = roleGuard('admin', 'supervisor');
    await preHandler(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12);
      delete updateData.password;
    } else {
      delete updateData.password;
    }

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        supervisorId: users.supervisorId,
        createdAt: users.createdAt,
      });

    if (!result[0]) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send(result[0]);
  });

  fastify.delete('/api/users/:id', async (request, reply) => {
    const preHandler = roleGuard('admin', 'supervisor');
    await preHandler(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };

    if (id === request.user.userId) {
      return reply.status(400).send({ error: 'Cannot delete your own account' });
    }

    const result = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });

    if (!result[0]) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ message: 'User deleted' });
  });
}
