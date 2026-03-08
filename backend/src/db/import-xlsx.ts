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

async function importLeads() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx import-xlsx.ts <file.xlsx>');
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<LeadRow>(sheet, { defval: '' });

  console.log(`Parsed ${rows.length} rows from sheet "${sheetName}"`);

  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // Batch insert for speed
  const batchSize = 50;
  const toInsert: Array<{
    name: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    industry: string | null;
    status: string;
    address: string | null;
    country: string | null;
  }> = [];

  for (const row of rows) {
    const name = String(row['Názov spoločnosti'] || '').trim();
    const website = String(row['URL stránka'] || '').trim();
    const phone = String(row['__EMPTY'] || '').trim();
    const email = String(row['E-mail'] || '').trim();
    const industry = String(row['ke'] || '').trim();
    const status = String(row['Status'] || '').trim();
    const notes = String(row['Notes'] || '').trim();

    // Use website domain as name if no company name
    let companyName = name;
    if (!companyName && website) {
      try {
        const url = website.startsWith('http') ? website : `https://${website}`;
        companyName = new URL(url).hostname.replace('www.', '');
      } catch {
        companyName = website;
      }
    }

    if (!companyName) {
      skipped++;
      continue;
    }

    // Map status
    let dbStatus = 'new';
    const sl = status.toLowerCase();
    if (sl.includes('aktívny') || sl.includes('aktivny') || sl.includes('klient')) {
      dbStatus = 'closed';
    } else if (sl.includes('cp poslan') || sl.includes('poslaná') || sl.includes('cp ') || sl.includes('cenov')) {
      dbStatus = 'interested';
    } else if (sl.includes('kontaktov') || sl.includes('volaný') || sl.includes('volany') || sl.includes('email poslan')) {
      dbStatus = 'contacted';
    } else if (sl.includes('nezáujem') || sl.includes('nezaujem') || sl.includes('nereag') || sl.includes('bez záujmu')) {
      dbStatus = 'not_interested';
    }

    toInsert.push({
      name: companyName,
      phone: phone || null,
      email: email || null,
      website: website || null,
      industry: industry || null,
      status: dbStatus,
      address: notes || null,
      country: 'SK',
    });
  }

  console.log(`Preparing to insert ${toInsert.length} companies...`);

  // Insert in batches
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    try {
      await sql`
        INSERT INTO companies ${sql(batch, 'name', 'phone', 'email', 'website', 'industry', 'status', 'address', 'country')}
        ON CONFLICT DO NOTHING
      `;
      inserted += batch.length;
    } catch (err) {
      // Fallback: insert one by one
      for (const item of batch) {
        try {
          await sql`
            INSERT INTO companies (name, phone, email, website, industry, status, address, country)
            VALUES (${item.name}, ${item.phone}, ${item.email}, ${item.website}, ${item.industry}, ${item.status}, ${item.address}, ${item.country})
          `;
          inserted++;
        } catch (e) {
          errors++;
        }
      }
    }

    if ((i + batchSize) % 500 === 0 || i + batchSize >= toInsert.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, toInsert.length)} / ${toInsert.length}`);
    }
  }

  console.log(`\nDone!`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped (no name): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  await sql.end();
}

importLeads();
