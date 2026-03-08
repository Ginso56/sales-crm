import { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload } from './authMiddleware.js';

type Role = 'admin' | 'supervisor' | 'salesman';

export function roleGuard(...allowedRoles: Role[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user as JwtPayload;

    if (!user) {
      reply.status(401).send({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      reply.status(403).send({ error: 'Forbidden: insufficient permissions' });
      return;
    }
  };
}
