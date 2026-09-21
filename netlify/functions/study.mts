import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { GoogleGenAI } from '@google/genai'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { materials } from '../../db/schema.js'

const instructions = {
  summary: `Devuelve JSON: {"title":string,"sections":[{"heading":string,"points":[string]}],"definitions":[{"term":string,"definition":string}]}. Crea un resumen completo, ordenado y útil para medicina.`,
  questions: `Devuelve JSON: {"questions":[{"question":string,"options":[string,string,string,string],"correctIndex":number,"explanation":string,"reinforcement":string,"difficulty":"básica"|"intermedia"|"avanzada"}]}. Genera exactamente 10 preguntas, ordenadas de básica a avanzada.`,
  flashcards: `Devuelve JSON: {"flashcards":[{"front":string,"back":string}]}. Genera exactamente 10 tarjetas claras y concisas.`,
} as const

function isValidResult(mode: keyof typeof instructions, value: unknown) {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  if (mode === 'summary') return typeof data.title === 'string' && Array.isArray(data.sections) && data.sections.length > 0 && data.sections.every(item => {
    if (!item || typeof item !== 'object') return false
    const section = item as Record<string, unknown>
    return typeof section.heading === 'string' && Array.isArray(section.points) && section.points.every(point => typeof point === 'string')
  }) && Array.isArray(data.definitions) && data.definitions.every(item => {
    if (!item || typeof item !== 'object') return false
    const definition = item as Record<string, unknown>
    return typeof definition.term === 'string' && typeof definition.definition === 'string'
  })
  if (mode === 'questions') return Array.isArray(data.questions) && data.questions.length === 10 && data.questions.every(item => {
    if (!item || typeof item !== 'object') return false
    const question = item as Record<string, unknown>
    return typeof question.question === 'string' && Array.isArray(question.options) && question.options.length === 4 && question.options.every(option => typeof option === 'string') && Number.isInteger(question.correctIndex) && Number(question.correctIndex) >= 0 && Number(question.correctIndex) < 4 && typeof question.explanation === 'string' && (question.reinforcement === undefined || typeof question.reinforcement === 'string')
  })
  return Array.isArray(data.flashcards) && data.flashcards.length === 10 && data.flashcards.every(item => {
    if (!item || typeof item !== 'object') return false
    const card = item as Record<string, unknown>
    return typeof card.front === 'string' && typeof card.back === 'string'
  })
}

export default async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Método no permitido.' }, { status: 405 })
  try {
    const { materialId, mode } = await req.json() as { materialId?: string; mode?: keyof typeof instructions }
    if (!materialId || !mode || !instructions[mode]) return Response.json({ error: 'Solicitud de estudio inválida.' }, { status: 400 })
    const [material] = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1)
    if (!material) return Response.json({ error: 'No encontramos este material.' }, { status: 404 })
    const pdf = await getStore({ name: 'medstudy-pdfs', consistency: 'strong' }).get(material.blobKey, { type: 'arrayBuffer' })
    if (!(pdf instanceof ArrayBuffer)) return Response.json({ error: 'No pudimos abrir el PDF.' }, { status: 404 })
    const base64 = Buffer.from(pdf).toString('base64')
    const ai = new GoogleGenAI({})
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType: 'application/pdf', data: base64 } },
        { text: `Usa exclusivamente la información sustentada por el PDF adjunto. No inventes datos. Escribe en español. ${instructions[mode]} Devuelve solo JSON válido.` },
      ] }],
      config: { responseMimeType: 'application/json', temperature: 0.25 },
    })
    const text = response.text
    if (!text) throw new Error('Empty response')
    const result: unknown = JSON.parse(text)
    if (!isValidResult(mode, result)) throw new Error('Invalid response shape')
    return Response.json(result)
  } catch {
    return Response.json({ error: 'No pudimos analizar el material. Revisa el PDF e inténtalo nuevamente.' }, { status: 500 })
  }
}

export const config: Config = { path: '/api/study' }
