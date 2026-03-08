import { pgTable, uuid, varchar, text, boolean, timestamp, integer, date } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  supervisorId: uuid('supervisor_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  address: text('address'),
  country: varchar('country', { length: 100 }),
  industry: varchar('industry', { length: 100 }),
  status: varchar('status', { length: 30 }).default('new'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  priorityFollowup: boolean('priority_followup').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const companyHistory = pgTable('company_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  changedBy: uuid('changed_by').references(() => users.id),
  fieldName: varchar('field_name', { length: 100 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow(),
});

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const noteAttachments = pgTable('note_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  noteId: uuid('note_id').references(() => notes.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  fileName: varchar('file_name', { length: 255 }),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
});

export const callLogs = pgTable('call_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id),
  salesmanId: uuid('salesman_id').references(() => users.id),
  status: varchar('status', { length: 20 }).notNull(),
  calledAt: timestamp('called_at', { withTimezone: true }),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),
  shipmentCount: integer('shipment_count'),
  shipmentDestinations: text('shipment_destinations').array(),
  shippingCompany: varchar('shipping_company', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const scheduledCalls = pgTable('scheduled_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  scheduledBy: uuid('scheduled_by').references(() => users.id),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  title: varchar('title', { length: 255 }),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  targetCalls: integer('target_calls'),
  targetNewClients: integer('target_new_clients'),
  targetShipments: integer('target_shipments'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
