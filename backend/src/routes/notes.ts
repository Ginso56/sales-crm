import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { notes, noteAttachments, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { writeAuditLog } from '../services/auditService.js';
import { v2 as cloudinary } from 'cloudinary';

const createNoteSchema = z.object({
  content: z.string().min(1),
});

export async function noteRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // Configure cloudinary
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
  }

  fastify.get('/api/notes/:companyId', async (request, reply) => {
    const { companyId } = request.params as { companyId: string };

    const notesList = await db
      .select({
        id: notes.id,
        companyId: notes.companyId,
        authorId: notes.authorId,
        authorName: users.name,
        content: notes.content,
        createdAt: notes.createdAt,
      })
      .from(notes)
      .leftJoin(users, eq(notes.authorId, users.id))
      .where(eq(notes.companyId, companyId))
      .orderBy(desc(notes.createdAt));

    // Fetch attachments for all notes
    const noteIds = notesList.map(n => n.id);
    let attachments: Array<{
      id: string;
      noteId: string | null;
      fileUrl: string;
      fileName: string | null;
      uploadedAt: Date | null;
    }> = [];

    if (noteIds.length > 0) {
      attachments = await db
        .select()
        .from(noteAttachments)
        .where(eq(noteAttachments.noteId, noteIds[0]));

      if (noteIds.length > 1) {
        for (let i = 1; i < noteIds.length; i++) {
          const more = await db
            .select()
            .from(noteAttachments)
            .where(eq(noteAttachments.noteId, noteIds[i]));
          attachments = attachments.concat(more);
        }
      }
    }

    const notesWithAttachments = notesList.map(note => ({
      ...note,
      attachments: attachments.filter(a => a.noteId === note.id),
    }));

    return reply.send(notesWithAttachments);
  });

  fastify.post('/api/notes/:companyId', async (request, reply) => {
    const { companyId } = request.params as { companyId: string };
    const parsed = createNoteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const result = await db
      .insert(notes)
      .values({
        companyId,
        authorId: request.user.userId,
        content: parsed.data.content,
      })
      .returning();

    await writeAuditLog(companyId, request.user.userId, 'nová poznámka', null, parsed.data.content.substring(0, 200));

    return reply.status(201).send(result[0]);
  });

  fastify.delete('/api/notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const note = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!note[0]) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const noteData = note[0];
    const user = request.user;

    // Permission check
    if (user.role === 'salesman') {
      if (noteData.authorId !== user.userId) {
        return reply.status(403).send({ error: 'Can only delete your own notes' });
      }
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (noteData.createdAt && noteData.createdAt < oneHourAgo) {
        return reply.status(403).send({ error: 'Can only delete notes within 1 hour of creation' });
      }
    }

    if (user.role === 'supervisor') {
      // Supervisor can delete team notes - need to check if note author is in their team
      const author = await db.select().from(users).where(eq(users.id, noteData.authorId!)).limit(1);
      if (author[0] && author[0].supervisorId !== user.userId && author[0].id !== user.userId) {
        return reply.status(403).send({ error: 'Can only delete notes from your team' });
      }
    }

    await db.delete(notes).where(eq(notes.id, id));
    await writeAuditLog(noteData.companyId!, request.user.userId, 'poznámka vymazaná', noteData.content?.substring(0, 200) || null, null);
    return reply.send({ message: 'Note deleted' });
  });

  fastify.post('/api/notes/:id/attachments', async (request, reply) => {
    const { id } = request.params as { id: string };

    const note = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!note[0]) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();

    try {
      const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: 'sales-crm/attachments',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string });
          }
        ).end(buffer);
      });

      const attachment = await db
        .insert(noteAttachments)
        .values({
          noteId: id,
          fileUrl: uploadResult.secure_url,
          fileName: data.filename,
        })
        .returning();

      const noteForAudit = note[0];
      await writeAuditLog(noteForAudit.companyId!, request.user.userId, 'nová príloha', null, data.filename || 'súbor');

      return reply.status(201).send(attachment[0]);
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to upload file' });
    }
  });
}
