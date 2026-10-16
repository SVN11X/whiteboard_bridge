import Dexie, { type EntityTable } from 'dexie';
import { parseBoard, type Board } from '../models/document';
export type Revision = { id?: number; boardId: string; savedAt: string; document: Board };
export const db = new Dexie('whiteboard-bridge-v2') as Dexie & {
  boards: EntityTable<Board, 'id'>;
  revisions: EntityTable<Revision, 'id'>;
  settings: EntityTable<{ key: string; value: unknown }, 'key'>;
};
db.version(1).stores({ boards: 'id,updatedAt,name', revisions: '++id,boardId,savedAt', settings: 'key' });
let queue: Promise<unknown> = Promise.resolve();
const revisionTimes = new Map<string, number>();
export async function saveBoard(board: Board): Promise<void> {
  const snapshot = parseBoard(board);
  const job = queue.catch(() => {}).then(() => db.transaction('rw', db.boards, db.revisions, async () => {
    await db.boards.put(snapshot);
    if (Date.now() - (revisionTimes.get(board.id) ?? 0) > 15_000) {
      await db.revisions.add({ boardId: board.id, savedAt: new Date().toISOString(), document: snapshot });
      revisionTimes.set(board.id, Date.now());
      const old = await db.revisions.where('boardId').equals(board.id).sortBy('savedAt');
      await db.revisions.bulkDelete(old.slice(0, -5).map(r => r.id!));
    }
  })); queue = job; return job;
}
export const listBoards = () => db.boards.orderBy('updatedAt').reverse().toArray();
export async function removeBoard(id: string) {
  await queue.catch(() => {});
  await db.transaction('rw', db.boards, db.revisions, async () => { await db.boards.delete(id); await db.revisions.where('boardId').equals(id).delete(); });
}
export const getSetting = async <T,>(key: string, fallback: T): Promise<T> => (await db.settings.get(key))?.value as T ?? fallback;
export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value });
export async function backup(): Promise<string> {
  await queue.catch(() => {});
  return JSON.stringify({ schema: 'whiteboard-bridge-backup', version: 1, exportedAt: new Date().toISOString(), boards: await listBoards() }, null, 2);
}
export async function restoreBackup(raw: unknown): Promise<number> {
  if (!raw || typeof raw !== 'object' || !('schema' in raw) || raw.schema !== 'whiteboard-bridge-backup' || !('boards' in raw) || !Array.isArray(raw.boards) || raw.boards.length > 100) throw new Error('Respaldo no válido (máximo 100 pizarras).');
  const boards = raw.boards.map(parseBoard).map(b => ({ ...b, id: crypto.randomUUID(), name: `${b.name.slice(0, 95)} (restaurada)` }));
  await queue.catch(() => {});
  await db.transaction('rw', db.boards, async () => { await db.boards.bulkPut(boards); }); return boards.length;
}
