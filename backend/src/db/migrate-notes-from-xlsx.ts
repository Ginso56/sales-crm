import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '..', '.env') });

import postgres from 'postgres';
import XLSX from 'xlsx';

interface LeadRow {
  ke: string;
  'URL stránka': string;
  __EMPTY: string;
  'E-mail': string;
  'IČO': string | number;
  'Názov spoločnosti': string;
  'Posledná tržba': string;
  Status: string;
  Notes: string;
  CMS: string;
  'Vypracovať CP': boolean;
  'Sales Manager': string;
  'Posledné zmeny': string;
}

async function migrateNotes() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx migrate-notes-from-xlsx.ts <file.xlsx>');
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<LeadRow>(sheet, { defval: '' });

  console.log(`Parsed ${rows.length} rows from sheet "${sheetName}"`);

  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

  let notesAdded = 0;
  let changesAdded = 0;
  let addressFixed = 0;
  let notFound = 0;

  for (const row of rows) {
    const name = String(row['Názov spoločnosti'] || '').trim();
    const website = String(row['URL stránka'] || '').trim();
    const notes = String(row['Notes'] || '').trim();
    const lastChanges = String(row['Posledné zmeny'] || '').trim();
    const salesManager = String(row['Sales Manager'] || '').trim();
    const status = String(row['Status'] || '').trim();
    const lastRevenue = String(row['Posledná tržba'] || '').trim();
    const cms = String(row['CMS'] || '').trim();
    const ico = String(row['IČO'] || '').trim();

    // Build company name same way as original import
    let companyName = name;
    if (!companyName && website) {
      try {
        const url = website.startsWith('http') ? website : `https://${website}`;
        companyName = new URL(url).hostname.replace('www.', '');
      } catch {
        companyName = website;
      }
    }
    if (!companyName) continue;

    // Find company in DB
    const companies = await sql`SELECT id, address FROM companies WHERE name = ${companyName} LIMIT 1`;
    if (!companies[0]) {
      notFound++;
      continue;
    }

    const companyId = companies[0].id;

    // Fix address - original import stored Notes in address field, set it to null
    if (companies[0].address === notes && notes) {
      await sql`UPDATE companies SET address = NULL WHERE id = ${companyId}`;
      addressFixed++;
    }

    // Add Notes as a note
    if (notes) {
      // Check if this note already exists
      const existing = await sql`SELECT id FROM notes WHERE company_id = ${companyId} AND content = ${notes} LIMIT 1`;
      if (!existing[0]) {
        await sql`INSERT INTO notes (company_id, content, created_at) VALUES (${companyId}, ${notes}, NOW())`;
        notesAdded++;
      }
    }

    // Add Posledné zmeny as audit log entry
    if (lastChanges) {
      const existing = await sql`SELECT id FROM company_history WHERE company_id = ${companyId} AND field_name = 'posledné zmeny (Excel)' AND new_value = ${lastChanges} LIMIT 1`;
      if (!existing[0]) {
        await sql`INSERT INTO company_history (company_id, field_name, old_value, new_value, changed_at) VALUES (${companyId}, ${'posledné zmeny (Excel)'}, NULL, ${lastChanges}, NOW())`;
        changesAdded++;
      }
    }

    // Add extra info as audit log: Sales Manager, Status, IČO, CMS, Posledná tržba
    const extraEntries: Array<{ field: string; value: string }> = [];
    if (salesManager) extraEntries.push({ field: 'sales manager (Excel)', value: salesManager });
    if (status) extraEntries.push({ field: 'status (Excel)', value: status });
    if (ico) extraEntries.push({ field: 'IČO (Excel)', value: ico });
    if (cms) extraEntries.push({ field: 'CMS (Excel)', value: cms });
    if (lastRevenue) extraEntries.push({ field: 'posledná tržba (Excel)', value: lastRevenue });

    for (const entry of extraEntries) {
      const existing = await sql`SELECT id FROM company_history WHERE company_id = ${companyId} AND field_name = ${entry.field} AND new_value = ${entry.value} LIMIT 1`;
      if (!existing[0]) {
        await sql`INSERT INTO company_history (company_id, field_name, old_value, new_value, changed_at) VALUES (${companyId}, ${entry.field}, NULL, ${entry.value}, NOW())`;
        changesAdded++;
      }
    }
  }

  console.log(`\nDone!`);
  console.log(`  Notes added: ${notesAdded}`);
  console.log(`  History entries added: ${changesAdded}`);
  console.log(`  Address field fixed: ${addressFixed}`);
  console.log(`  Companies not found: ${notFound}`);

  await sql.end();
}

migrateNotes();
