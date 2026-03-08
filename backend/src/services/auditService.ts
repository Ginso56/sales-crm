import { db } from '../db/connection.js';
import { companyHistory } from '../db/schema.js';

export async function writeAuditLog(
  companyId: string,
  changedBy: string,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null
): Promise<void> {
  await db.insert(companyHistory).values({
    companyId,
    changedBy,
    fieldName,
    oldValue,
    newValue,
  });
}
