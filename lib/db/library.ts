import Dexie, { type Table } from "dexie";

export interface DownloadRecord {
  id?: number;
  mangaId: string;
  mangaTitle: string;
  coverUrl: string | null;
  label: string;
  fileName: string;
  bytes: number;
  at: number;
}

export interface FavoriteRecord {
  mangaId: string;
  title: string;
  coverUrl: string | null;
  status: string | null;
  at: number;
}

export interface ReadRecord {
  mangaId: string;
  mangaTitle: string;
  coverUrl: string | null;
  chapterId: string;
  chapterNumber: string | null;
  at: number;
}

class HarborDB extends Dexie {
  downloads!: Table<DownloadRecord, number>;
  favorites!: Table<FavoriteRecord, string>;
  reads!: Table<ReadRecord, string>;

  constructor() {
    super("harbor");
    this.version(1).stores({
      downloads: "++id, mangaId, at",
      favorites: "mangaId, at",
      reads: "mangaId, at", // one "continue reading" entry per manga
    });
  }
}

// Lazily construct so importing this module never touches indexedDB on the
// server or in tests (where it's undefined).
let _db: HarborDB | null = null;
function db(): HarborDB | null {
  if (typeof indexedDB === "undefined") return null;
  if (!_db) _db = new HarborDB();
  return _db;
}

export async function recordDownload(rec: DownloadRecord): Promise<void> {
  await db()?.downloads.add(rec);
}

export async function listDownloads(): Promise<DownloadRecord[]> {
  const d = db();
  if (!d) return [];
  return d.downloads.orderBy("at").reverse().toArray();
}

export async function addFavorite(rec: FavoriteRecord): Promise<void> {
  await db()?.favorites.put(rec);
}

export async function removeFavorite(mangaId: string): Promise<void> {
  await db()?.favorites.delete(mangaId);
}

export async function isFavorite(mangaId: string): Promise<boolean> {
  const d = db();
  if (!d) return false;
  return (await d.favorites.get(mangaId)) != null;
}

export async function listFavorites(): Promise<FavoriteRecord[]> {
  const d = db();
  if (!d) return [];
  return d.favorites.orderBy("at").reverse().toArray();
}

export async function recordRead(rec: ReadRecord): Promise<void> {
  await db()?.reads.put(rec);
}

export async function listRecentReads(): Promise<ReadRecord[]> {
  const d = db();
  if (!d) return [];
  return d.reads.orderBy("at").reverse().toArray();
}

/** Live-query helper instances (used with dexie-react-hooks useLiveQuery). */
export const libraryDb = db;
