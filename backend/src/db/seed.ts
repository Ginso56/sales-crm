import postgres from 'postgres';
import bcrypt from 'bcryptjs';

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = postgres(connectionString, { ssl: 'require' });

  const adminPassword = await bcrypt.hash('admin123', 12);
  const supervisorPassword = await bcrypt.hash('supervisor123', 12);
  const salesmanPassword = await bcrypt.hash('salesman123', 12);

  // Create admin
  const [admin] = await sql`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Admin User', 'admin@salescrm.com', ${adminPassword}, 'admin')
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;

  // Create supervisor
  const [supervisor] = await sql`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Peter Supervisor', 'peter@salescrm.com', ${supervisorPassword}, 'supervisor')
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;

  // Create salesmen
  const [salesman1] = await sql`
    INSERT INTO users (name, email, password_hash, role, supervisor_id)
    VALUES ('Jano Predajca', 'jano@salescrm.com', ${salesmanPassword}, 'salesman', ${supervisor?.id || null})
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;

  const [salesman2] = await sql`
    INSERT INTO users (name, email, password_hash, role, supervisor_id)
    VALUES ('Maria Predajca', 'maria@salescrm.com', ${salesmanPassword}, 'salesman', ${supervisor?.id || null})
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;

  console.log('Seed completed!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin:      admin@salescrm.com / admin123');
  console.log('  Supervisor: peter@salescrm.com / supervisor123');
  console.log('  Salesman:   jano@salescrm.com  / salesman123');
  console.log('  Salesman:   maria@salescrm.com / salesman123');

  await sql.end();
}

seed();
