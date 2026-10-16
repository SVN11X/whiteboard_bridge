import { makeObject, type BoardObject, type Point, type AnchorSide } from '../models/document';
import { reconcile } from '../editor/geometry';
import { WHITEBOARD_NOTE_COLORS as colors } from '../clipboard/whiteboard';
export const TEMPLATE_CATEGORIES = ['Ideación', 'Planificación', 'Reuniones', 'Diagramas'] as const;
export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];
type Template = { id: string; name: string; description: string; category: TemplateCategory; build: () => BoardObject[] };
const text = (x: number, y: number, value: string, width = 260, fontSize = 24) => makeObject('text', { x, y }, { text: value, width, height: fontSize > 26 ? 60 : 74, fontSize, textColor: '#242424', label: value });
const title = (value: string) => text(0, 0, value, 1000, 30);
const note = (x: number, y: number, value = '', color = colors[0], width = 230, height = 170) => makeObject('sticky', { x, y }, { text: value, fill: color, width, height, fontSize: 20, label: value || 'Nota de plantilla' });
const box = (x: number, y: number, value: string, shape: 'rect' | 'ellipse' | 'diamond' = 'rect', fill = '#b5ddf5', width = 180, height = 110) => makeObject('shape', { x, y }, { shape, text: value, label: value, fill, stroke: '#454545', textColor: '#242424', fontSize: 21, width, height });
function connect(from: BoardObject, to: BoardObject, fromAnchor: AnchorSide, toAnchor: AnchorSide) { return makeObject('line', { x: 0, y: 0 }, { fromId: from.id, toId: to.id, fromAnchor, toAnchor, stroke: '#606060', strokeWidth: 2.5, arrow: 'end' }); }
function columns(heading: string, labels: string[], prompts: string[] = []) {
  return [title(heading), ...labels.flatMap((label, i) => [text(i * 275, 85, label, 250), note(i * 275, 165, prompts[i] ?? '', colors[i % colors.length], 245, 210)])];
}
export const TEMPLATES: Template[] = [
  { id: 'ideas', name: 'Lluvia de ideas', description: 'Seis notas para explorar propuestas.', category: 'Ideación', build: () => [title('Lluvia de ideas'), ...Array.from({ length: 6 }, (_, i) => note(i % 3 * 280, 90 + Math.floor(i / 3) * 220, '', colors[i], 240, 185))] },
  { id: 'kanban', name: 'Plan de trabajo', description: 'Organiza tareas por hacer, en proceso y terminadas.', category: 'Planificación', build: () => columns('Plan de trabajo', ['Por hacer', 'En proceso', 'Terminado']) },
  { id: 'map', name: 'Mapa de ideas', description: 'Una idea central y cuatro conexiones.', category: 'Ideación', build: () => {
    const central = box(280, 215, 'Idea principal', 'ellipse', '#b5ddf5', 200, 110);
    const notes = [note(0, 90, '', colors[0], 200, 150), note(560, 90, '', colors[1], 200, 150), note(0, 360, '', colors[2], 200, 150), note(560, 360, '', colors[3], 200, 150)];
    return [title('Conectar ideas'), central, ...notes, ...notes.map((n, i) => connect(central, n, i % 2 ? 'right' : 'left', i % 2 ? 'left' : 'right'))];
  } },
  { id: 'swot', name: 'Análisis DAFO', description: 'Fortalezas, debilidades, oportunidades y amenazas.', category: 'Planificación', build: () => [title('Análisis DAFO'), ...['Fortalezas', 'Debilidades', 'Oportunidades', 'Amenazas'].flatMap((label, i) => {
    const x = i % 2 * 420, y = 90 + Math.floor(i / 2) * 290;
    return [box(x, y, label, 'rect', ['#cbe799', '#ffe6a1', '#99d9ef', '#f18992'][i], 380, 60), note(x, y + 80, '', colors[i], 175, 160), note(x + 205, y + 80, '', colors[i], 175, 160)];
  })] },
  { id: 'retro', name: 'Retrospectiva', description: 'Qué continuar, empezar y dejar de hacer.', category: 'Reuniones', build: () => columns('Retrospectiva del equipo', ['Continuar', 'Empezar', 'Dejar de hacer'], ['¿Qué está funcionando?', '¿Qué podemos probar?', '¿Qué nos frena?']) },
  { id: 'priorities', name: 'Matriz de prioridades', description: 'Compara impacto y esfuerzo antes de decidir.', category: 'Planificación', build: () => {
    const labels = ['Alto impacto · poco esfuerzo', 'Alto impacto · mucho esfuerzo', 'Bajo impacto · poco esfuerzo', 'Bajo impacto · mucho esfuerzo'];
    return [title('Impacto y esfuerzo'), ...labels.flatMap((label, i) => { const x = i % 2 * 430, y = 100 + Math.floor(i / 2) * 270; return [box(x, y, label, 'rect', '#f4f6fa', 395, 235), note(x + 35, y + 85, '', colors[i], 320, 125)]; }), text(0, 665, 'Mueve las propuestas al cuadrante que corresponda.', 860, 20)];
  } },
  { id: 'project', name: 'Plan de proyecto', description: 'Define objetivos, tareas, responsables y fechas.', category: 'Planificación', build: () => columns('Plan de proyecto', ['Objetivo', 'Tareas', 'Responsable', 'Fecha'], ['¿Qué queremos lograr?', '¿Qué hay que hacer?', '¿Quién lo realizará?', '¿Para cuándo?']) },
  { id: 'meeting', name: 'Agenda de reunión', description: 'Prepara temas y registra decisiones y acuerdos.', category: 'Reuniones', build: () => columns('Agenda y acuerdos', ['Objetivo', 'Temas', 'Decisiones', 'Próximos pasos'], ['Propósito de la reunión', 'Puntos por conversar', 'Acuerdos alcanzados', 'Acción, responsable y fecha']) },
  { id: 'timeline', name: 'Línea de tiempo', description: 'Cuatro etapas para ordenar hitos y fechas.', category: 'Diagramas', build: () => {
    const stages = ['Inicio', 'Planificación', 'Ejecución', 'Cierre'].map((value, i) => box(i * 260, 130, value, 'rect', colors[i], 205, 100));
    return [title('Línea de tiempo'), ...stages, ...stages.slice(1).map((stage, i) => connect(stages[i], stage, 'right', 'left')), ...stages.map((stage, i) => note(stage.x, 280, `Fecha / hito ${i + 1}`, colors[i], 205, 150))];
  } },
  { id: 'flow', name: 'Diagrama de flujo', description: 'Proceso con una decisión y un camino de revisión.', category: 'Diagramas', build: () => {
    const start = box(0, 140, 'Inicio', 'ellipse', '#cbe799', 155, 95), task = box(230, 140, 'Definir tarea', 'rect', '#b5ddf5', 180, 95), decision = box(490, 120, '¿Aprobada?', 'diamond', '#ffe6a1', 190, 135), done = box(790, 140, 'Realizar', 'rect', '#cbe799', 180, 95), review = box(490, 380, 'Revisar', 'rect', '#fbc19e', 190, 100);
    return [title('Proceso y decisión'), start, task, decision, done, review, connect(start, task, 'right', 'left'), connect(task, decision, 'right', 'left'), connect(decision, done, 'right', 'left'), connect(decision, review, 'bottom', 'top'), connect(review, task, 'left', 'bottom'), text(710, 125, 'Sí', 60, 18), text(600, 285, 'No', 60, 18)];
  } },
  { id: 'empathy', name: 'Mapa de empatía', description: 'Explora lo que una persona piensa, ve, dice y escucha.', category: 'Ideación', build: () => [title('Mapa de empatía'), box(350, 270, 'Persona', 'ellipse', '#c9a3dd', 190, 110), ...['Piensa y siente', 'Ve', 'Dice y hace', 'Escucha'].flatMap((label, i) => { const x = i % 2 * 600, y = 90 + Math.floor(i / 2) * 315; return [text(x, y, label, 280), note(x, y + 70, '', colors[i], 280, 175)]; })] },
  { id: 'comparison', name: 'Comparar alternativas', description: 'Contrasta ventajas, dificultades y una decisión final.', category: 'Ideación', build: () => [title('Comparar alternativas'), ...['Opción A', 'Opción B'].flatMap((label, i) => [box(i * 420, 90, label, 'rect', colors[i], 380, 60), ...['Ventajas', 'Dificultades', 'Qué necesitamos'].map((value, row) => note(i * 420, 180 + row * 180, value, colors[i], 380, 150))]), text(0, 740, 'Decisión y fundamento:', 800)] },
];
export function createTemplate(id: string, at: Point = { x: 0, y: 0 }): BoardObject[] {
  const template = TEMPLATES.find(item => item.id === id); if (!template) throw new Error('Plantilla no disponible.');
  return reconcile(template.build().map((o, i) => ({ ...o, x: o.x + at.x, y: o.y + at.y, zIndex: i })));
}
