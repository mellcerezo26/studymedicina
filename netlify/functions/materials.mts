import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { materials, subjects } from '../../db/schema.js'

// Netlify bufferiza un máximo de 6 MB. Se dejan 2 MB de margen para la
// codificación base64 del transporte y la envoltura multipart del formulario.
const MAX_PDF_BYTES = 4 * 1024 * 1024

const jsonError = (message: string, status = 400) => Response.json({ error: message }, { status })

export default async (req: Request) => {
  const path = new URL(req.url).pathname
  if (path === '/api/subjects' && req.method === 'GET') {
    const rows = await db.select({ name: subjects.name }).from(subjects).orderBy(asc(subjects.name))
    return Response.json(rows.map(row => row.name))
  }
  if (req.method === 'GET') {
    const rows = await db.select({ id: materials.id, name: materials.name, subject: materials.subject, createdAt: materials.createdAt }).from(materials).orderBy(desc(materials.createdAt))
    return Response.json(rows)
  }
  if (req.method === 'DELETE') {
    const id = path.split('/').filter(Boolean)[2]
    if (!id) return jsonError('Material inválido.')
    const [material] = await db.select().from(materials).where(eq(materials.id, id)).limit(1)
    if (!material) return jsonError('No encontramos este material.', 404)
    await getStore({ name: 'medstudy-pdfs', consistency: 'strong' }).delete(material.blobKey)
    await db.delete(materials).where(eq(materials.id, id))
    return new Response(null, { status: 204 })
  }
  if (req.method !== 'POST') return jsonError('Método no permitido.', 405)
  try {
    const form = await req.formData()
    const file = form.get('file')
    const subject = String(form.get('subject') || '').trim()
    if (!(file instanceof File)) return jsonError('Selecciona un archivo PDF válido.')
    if (!subject) return jsonError('Selecciona una materia.')
    if (file.size > MAX_PDF_BYTES) return jsonError('El PDF no puede superar 4 MB.')
    const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer())
    if (new TextDecoder().decode(signature) !== '%PDF-') return jsonError('El archivo no contiene un PDF válido.')
    const id = crypto.randomUUID()
    const blobKey = `pdf/${id}`
    const store = getStore({ name: 'medstudy-pdfs', consistency: 'strong' })
    await store.set(blobKey, await file.arrayBuffer())
    try {
      await db.insert(subjects).values({ name: subject.slice(0, 80) }).onConflictDoNothing()
      const [created] = await db.insert(materials).values({ id, name: file.name.slice(0, 255), subject: subject.slice(0, 80), blobKey }).returning({ id: materials.id, name: materials.name, subject: materials.subject, createdAt: materials.createdAt })
      return Response.json(created, { status: 201 })
    } catch (error) {
      await store.delete(blobKey).catch(() => undefined)
      throw error
    }
  } catch {
    return jsonError('No pudimos guardar el documento. Inténtalo nuevamente.', 500)
  }
}

export const config: Config = { path: ['/api/materials', '/api/materials/:id', '/api/subjects'] }
