import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { companies } from '../db/schema.js';
import { eq, or, ilike } from 'drizzle-orm';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleGuard } from '../middleware/roleGuard.js';
import Papa from 'papaparse';

interface CsvRow {
  [key: string]: string;
}

interface ImportRequest {
  csvData: string;
  columnMapping: Record<string, string>;
  duplicateAction: 'skip' | 'overwrite';
}

export async function importRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  fastify.post('/api/import/csv', async (request, reply) => {
    const preHandler = roleGuard('admin');
    await preHandler(request, reply);
    if (reply.sent) return;

    const { csvData, columnMapping, duplicateAction } = request.body as ImportRequest;

    if (!csvData || !columnMapping) {
      return reply.status(400).send({ error: 'csvData and columnMapping are required' });
    }

    const parsed = Papa.parse<CsvRow>(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      return reply.status(400).send({
        error: 'CSV parsing errors',
        details: parsed.errors.slice(0, 10),
      });
    }

    const dbFields = ['name', 'phone', 'email', 'website', 'address', 'country', 'industry'] as const;
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      try {
        const mapped: Record<string, string> = {};
        for (const dbField of dbFields) {
          const csvColumn = columnMapping[dbField];
          if (csvColumn && row[csvColumn]) {
            mapped[dbField] = row[csvColumn].trim();
          }
        }

        if (!mapped.name) {
          errors.push({ row: i + 1, error: 'Missing company name' });
          errorCount++;
          continue;
        }

        // Check duplicates
        const duplicateConditions = [];
        if (mapped.phone) {
          duplicateConditions.push(ilike(companies.phone, mapped.phone));
        }
        if (mapped.name) {
          duplicateConditions.push(ilike(companies.name, mapped.name));
        }

        if (duplicateConditions.length > 0) {
          const existing = await db
            .select({ id: companies.id })
            .from(companies)
            .where(or(...duplicateConditions))
            .limit(1);

          if (existing[0]) {
            if (duplicateAction === 'skip') {
              skipCount++;
              continue;
            }
            // Overwrite
            await db
              .update(companies)
              .set({
                ...mapped,
                updatedAt: new Date(),
              })
              .where(eq(companies.id, existing[0].id));
            successCount++;
            continue;
          }
        }

        await db.insert(companies).values({
          name: mapped.name,
          phone: mapped.phone || null,
          email: mapped.email || null,
          website: mapped.website || null,
          address: mapped.address || null,
          country: mapped.country || null,
          industry: mapped.industry || null,
        });
        successCount++;
      } catch (err) {
        errors.push({ row: i + 1, error: String(err) });
        errorCount++;
      }
    }

    return reply.send({
      total: parsed.data.length,
      success: successCount,
      skipped: skipCount,
      errors: errorCount,
      errorDetails: errors,
    });
  });
}
