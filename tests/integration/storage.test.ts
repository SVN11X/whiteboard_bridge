import 'fake-indexeddb/auto';
import { afterAll, describe, expect, it } from 'vitest';
import { createBoard, demoBoard } from '../../src/models/document';
import { backup, db, listBoards, removeBoard, restoreBackup, saveBoard } from '../../src/persistence/database';
afterAll(async () => { await db.delete(); });
describe('IndexedDB y respaldos', () => {
  it('serializa escrituras y recupera la última edición', async () => { const b = demoBoard(); await Promise.all([saveBoard(b), saveBoard({ ...b, name: 'Última versión' })]); expect((await db.boards.get(b.id))?.name).toBe('Última versión'); });
  it('rechaza un guardado inválido sin destruir el documento válido', async () => { const b = demoBoard(); await saveBoard(b); await expect(saveBoard({ ...b, objects: [...b.objects, b.objects[0]] })).rejects.toThrow(); expect((await db.boards.get(b.id))?.objects).toHaveLength(8); });
  it('restaura copias sin reemplazar documentos existentes', async () => { const before = (await listBoards()).length, raw = await backup(); const n = await restoreBackup(JSON.parse(raw)); expect((await listBoards()).length).toBe(before + n); const ids = (await listBoards()).map(b => b.id); expect(new Set(ids).size).toBe(ids.length); });
  it('no restaura parcialmente un respaldo inválido', async () => { const count = await db.boards.count(); await expect(restoreBackup({ schema: 'whiteboard-bridge-backup', boards: [createBoard(), { version: 999 }] })).rejects.toThrow(); expect(await db.boards.count()).toBe(count); });
  it('elimina el documento y sus versiones', async () => { const b = demoBoard(); await saveBoard(b); expect(await db.revisions.where('boardId').equals(b.id).count()).toBe(1); await removeBoard(b.id); expect(await db.boards.get(b.id)).toBeUndefined(); expect(await db.revisions.where('boardId').equals(b.id).count()).toBe(0); });
});
