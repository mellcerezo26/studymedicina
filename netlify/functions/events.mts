import type { Config } from '@netlify/functions'
import { asc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { events, subjects } from '../../db/schema.js'

const jsonError = (message: string, status = 400) => Response.json({ error: message }, { status })

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}

export default async (req: Request) => {
  if (req.method === 'GET') {
    const rows = await db.select().from(events).orderBy(asc(events.date), asc(events.createdAt))
    return Response.json(rows)
  }
  if (req.method !== 'POST') return jsonError('Método no permitido.', 405)
  try {
    const body = await req.json() as { type?: string; name?: string; subject?: string; date?: string }
    const type = body.type === 'examen' ? 'examen' : body.type === 'actividad' ? 'actividad' : ''
    const name = String(body.name || '').trim()
    const subject = String(body.subject || '').trim()
    const date = String(body.date || '').trim()
    if (!type || !name || !subject || !isValidDate(date)) return jsonError('Completa todos los datos con una fecha válida.')
    if (name.length > 120 || subject.length > 80) return jsonError('El nombre o la materia son demasiado largos.')
    await db.insert(subjects).values({ name: subject }).onConflictDoNothing()
    const [created] = await db.insert(events).values({ id: crypto.randomUUID(), type, name, subject, date }).returning()
    return Response.json(created, { status: 201 })
  } catch {
    return jsonError('No pudimos guardar el registro. Inténtalo nuevamente.', 500)
  }
}

export const config: Config = { path: '/api/events' }
