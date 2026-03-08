import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { callLogs, companies, users, goals } from '../db/schema.js';
import { eq, and, gte, lte, sql, or, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleGuard } from '../middleware/roleGuard.js';

export async function statsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/stats/user/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Salesman can only view own stats
    if (request.user.role === 'salesman' && request.user.userId !== id) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      callsToday,
      callsWeek,
      callsMonth,
      callsPrevMonth,
      answeredMonth,
      noAnswerMonth,
      companiesAddedMonth,
      dailyCalls,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
        .where(and(eq(callLogs.salesmanId, id), gte(callLogs.calledAt, todayStart))),
      db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
        .where(and(eq(callLogs.salesmanId, id), gte(callLogs.calledAt, weekStart))),
      db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
        .where(and(eq(callLogs.salesmanId, id), gte(callLogs.calledAt, monthStart))),
      db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
        .where(and(eq(callLogs.salesmanId, id), gte(callLogs.calledAt, prevMonthStart), lte(callLogs.calledAt, prevMonthEnd))),
      db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
        .where(and(eq(callLogs.salesmanId, id), eq(callLogs.status, 'answered'), gte(callLogs.calledAt, monthStart))),
      db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
        .where(and(eq(callLogs.salesmanId, id), eq(callLogs.status, 'no_answer'), gte(callLogs.calledAt, monthStart))),
      db.select({ count: sql<number>`count(*)::int` }).from(companies)
        .where(and(eq(companies.assignedTo, id), gte(companies.createdAt, monthStart))),
      db.select({
        date: sql<string>`date(${callLogs.calledAt})`,
        count: sql<number>`count(*)::int`,
      }).from(callLogs)
        .where(and(eq(callLogs.salesmanId, id), gte(callLogs.calledAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))))
        .groupBy(sql`date(${callLogs.calledAt})`),
    ]);

    // Get current goals
    const currentGoals = await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.userId, id),
          lte(goals.periodStart, now.toISOString().split('T')[0]),
          gte(goals.periodEnd, now.toISOString().split('T')[0])
        )
      )
      .limit(1);

    // Get shipments this month
    const shipmentsMonth = await db
      .select({ total: sql<number>`COALESCE(sum(${callLogs.shipmentCount}), 0)::int` })
      .from(callLogs)
      .where(
        and(
          eq(callLogs.salesmanId, id),
          eq(callLogs.status, 'answered'),
          gte(callLogs.calledAt, monthStart)
        )
      );

    return reply.send({
      callsToday: callsToday[0]?.count || 0,
      callsWeek: callsWeek[0]?.count || 0,
      callsMonth: callsMonth[0]?.count || 0,
      callsPrevMonth: callsPrevMonth[0]?.count || 0,
      answeredMonth: answeredMonth[0]?.count || 0,
      noAnswerMonth: noAnswerMonth[0]?.count || 0,
      companiesAddedMonth: companiesAddedMonth[0]?.count || 0,
      shipmentsMonth: shipmentsMonth[0]?.total || 0,
      dailyCalls: dailyCalls,
      currentGoal: currentGoals[0] || null,
    });
  });

  fastify.get('/api/stats/team/:supervisorId', async (request, reply) => {
    const preHandler = roleGuard('admin', 'supervisor');
    await preHandler(request, reply);
    if (reply.sent) return;

    const { supervisorId } = request.params as { supervisorId: string };

    const teamMembers = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(or(eq(users.supervisorId, supervisorId), eq(users.id, supervisorId)));

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const now = new Date();

    const leaderboard = await Promise.all(
      teamMembers.map(async (member) => {
        const [totalCalls, answered, noAnswer, newClients, goalData, shipments] = await Promise.all([
          db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
            .where(and(eq(callLogs.salesmanId, member.id), gte(callLogs.calledAt, monthStart))),
          db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
            .where(and(eq(callLogs.salesmanId, member.id), eq(callLogs.status, 'answered'), gte(callLogs.calledAt, monthStart))),
          db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
            .where(and(eq(callLogs.salesmanId, member.id), eq(callLogs.status, 'no_answer'), gte(callLogs.calledAt, monthStart))),
          db.select({ count: sql<number>`count(*)::int` }).from(companies)
            .where(and(eq(companies.assignedTo, member.id), gte(companies.createdAt, monthStart))),
          db.select().from(goals)
            .where(and(
              eq(goals.userId, member.id),
              lte(goals.periodStart, now.toISOString().split('T')[0]),
              gte(goals.periodEnd, now.toISOString().split('T')[0])
            )).limit(1),
          db.select({ total: sql<number>`COALESCE(sum(${callLogs.shipmentCount}), 0)::int` }).from(callLogs)
            .where(and(eq(callLogs.salesmanId, member.id), eq(callLogs.status, 'answered'), gte(callLogs.calledAt, monthStart))),
        ]);

        const total = totalCalls[0]?.count || 0;
        const ans = answered[0]?.count || 0;
        const goalInfo = goalData[0];
        const goalPct = goalInfo?.targetCalls
          ? Math.round((total / goalInfo.targetCalls) * 100)
          : null;

        return {
          userId: member.id,
          name: member.name,
          callsMonth: total,
          answered: ans,
          noAnswer: noAnswer[0]?.count || 0,
          answerRate: total > 0 ? Math.round((ans / total) * 100) : 0,
          newClients: newClients[0]?.count || 0,
          shipments: shipments[0]?.total || 0,
          goalPct,
          goal: goalInfo || null,
        };
      })
    );

    leaderboard.sort((a, b) => b.callsMonth - a.callsMonth);

    // Conversion funnel
    const [newCount, contactedCount, interestedCount, closedCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(companies).where(eq(companies.status, 'new')),
      db.select({ count: sql<number>`count(*)::int` }).from(companies).where(eq(companies.status, 'contacted')),
      db.select({ count: sql<number>`count(*)::int` }).from(companies).where(eq(companies.status, 'interested')),
      db.select({ count: sql<number>`count(*)::int` }).from(companies).where(eq(companies.status, 'closed')),
    ]);

    return reply.send({
      leaderboard,
      funnel: {
        new: newCount[0]?.count || 0,
        contacted: contactedCount[0]?.count || 0,
        interested: interestedCount[0]?.count || 0,
        closed: closedCount[0]?.count || 0,
      },
    });
  });

  fastify.get('/api/stats/overview', async (request, reply) => {
    const preHandler = roleGuard('admin');
    await preHandler(request, reply);
    if (reply.sent) return;

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalCompanies, totalCalls, totalAnswered, totalUsers] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(companies),
      db.select({ count: sql<number>`count(*)::int` }).from(callLogs).where(gte(callLogs.calledAt, monthStart)),
      db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
        .where(and(eq(callLogs.status, 'answered'), gte(callLogs.calledAt, monthStart))),
      db.select({ count: sql<number>`count(*)::int` }).from(users),
    ]);

    return reply.send({
      totalCompanies: totalCompanies[0]?.count || 0,
      totalCallsMonth: totalCalls[0]?.count || 0,
      totalAnsweredMonth: totalAnswered[0]?.count || 0,
      totalUsers: totalUsers[0]?.count || 0,
    });
  });

  fastify.get('/api/stats/export/csv', async (request, reply) => {
    const preHandler = roleGuard('admin', 'supervisor');
    await preHandler(request, reply);
    if (reply.sent) return;

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const allUsers = request.user.role === 'admin'
      ? await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users)
      : await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users)
          .where(or(eq(users.supervisorId, request.user.userId), eq(users.id, request.user.userId)));

    const rows = await Promise.all(
      allUsers.map(async (u) => {
        const [total, answered] = await Promise.all([
          db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
            .where(and(eq(callLogs.salesmanId, u.id), gte(callLogs.calledAt, monthStart))),
          db.select({ count: sql<number>`count(*)::int` }).from(callLogs)
            .where(and(eq(callLogs.salesmanId, u.id), eq(callLogs.status, 'answered'), gte(callLogs.calledAt, monthStart))),
        ]);
        return {
          name: u.name,
          email: u.email,
          role: u.role,
          totalCalls: total[0]?.count || 0,
          answeredCalls: answered[0]?.count || 0,
          answerRate: (total[0]?.count || 0) > 0 ? Math.round(((answered[0]?.count || 0) / (total[0]?.count || 1)) * 100) : 0,
        };
      })
    );

    const csvHeader = 'Name,Email,Role,Total Calls,Answered Calls,Answer Rate %\n';
    const csvRows = rows.map(r => `${r.name},${r.email},${r.role},${r.totalCalls},${r.answeredCalls},${r.answerRate}`).join('\n');

    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename=team-stats.csv')
      .send(csvHeader + csvRows);
  });
}
