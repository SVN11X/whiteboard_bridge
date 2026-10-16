import { z } from 'zod';
export const OBJECT_CASES = ['Texto', 'Nota adhesiva', 'Rectángulo', 'Elipse', 'Flecha', 'Línea', 'Tinta digital', 'Imagen', 'Selección múltiple', 'Grupo'] as const;
export const CHECKS = { pasted: 'Se pega', nativeType: 'Conserva el tipo', editable: 'Propiedades nativas editables', colors: 'Conserva colores', positions: 'Conserva posiciones relativas', dimensions: 'Conserva dimensiones', groups: 'Conserva grupos', repeated: 'Reproducido en otra sesión' };
export const recordSchema = z.object({
  id: z.string(), date: z.string(), source: z.enum(['Bridge', 'Whiteboard']), target: z.enum(['Whiteboard Web', 'Whiteboard Teams', 'Bridge']),
  object: z.enum(OBJECT_CASES), mode: z.string().max(200), browser: z.string().max(100), browserVersion: z.string().max(40),
  account: z.enum(['Trabajo', 'Educativa', 'Personal', 'No aplica']),
  outcome: z.enum(['Aprobado', 'Parcial', 'Fallido', 'No ejecutado', 'Bloqueado por limitación técnica']),
  representation: z.enum(['Tipo nativo', 'Texto', 'Imagen', 'Otro', 'Sin resultado']),
  checks: z.record(z.string(), z.enum(['Sí', 'No', 'No aplica', 'Sin comprobar'])),
  note: z.string().max(1000), evidence: z.string().max(500), session: z.string().max(100),
  actualFormats: z.array(z.string()).max(20), recognizedFormat: z.string().max(200).optional(),
});
export type LabRecord = z.infer<typeof recordSchema>;
export function validateObservation(raw: LabRecord): LabRecord {
  const r = recordSchema.parse(raw);
  if (!r.browserVersion.trim() || !r.session.trim()) throw new Error('Indica la versión del navegador y la sesión de prueba.');
  if (r.outcome === 'Aprobado' && (r.representation !== 'Tipo nativo' || !['pasted', 'nativeType', 'editable', 'repeated'].every(k => r.checks[k] === 'Sí') || !r.evidence.trim())) throw new Error('Aprobado requiere tipo nativo, edición, repetición y una referencia a evidencia manual. PNG no valida natividad.');
  if (r.outcome === 'Aprobado' && r.object !== 'Imagen' && (r.mode === 'png' || (r.actualFormats.length === 1 && r.actualFormats[0] === 'image/png'))) throw new Error('Una representación PNG no acredita natividad de notas, figuras, tinta o grupos.');
  if (r.outcome === 'Aprobado' && Object.keys(CHECKS).some(key => !['Sí', 'No aplica'].includes(r.checks[key]))) throw new Error('Aprobado requiere comprobar todas las propiedades aplicables. Usa Parcial si se pierde alguna o no se ha comprobado.');
  if (r.outcome === 'Aprobado' && r.object === 'Grupo' && r.checks.groups !== 'Sí') throw new Error('Un grupo aprobado debe conservar su agrupación.');
  if (r.target === 'Whiteboard Teams' && r.account === 'Personal' && r.outcome === 'Aprobado') throw new Error('Revisa el tipo de cuenta y documenta el entorno soportado.');
  return r;
}
export function initialMatrix() {
  return OBJECT_CASES.flatMap(object => ['Whiteboard → Whiteboard', 'Bridge → Whiteboard'].map(direction => ({ object, direction, formats: direction.startsWith('Bridge') ? ['plain', 'html', 'png', 'custom', 'mixed'] : ['Ctrl+C / menú oficial'], status: 'No ejecutado', evidence: null })));
}
