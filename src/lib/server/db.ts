// The whole data layer: every file in data/ is plain JSON you can open and edit.
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('data');

export type Role = 'SU' | 'RC' | 'VC';

export interface User {
  username: string;
  name: string;
  passwordHash: string; // "salt:hash", scrypt
  role: Role;
  balance: number;
  warnings: number;
  suspended: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number;
  price: number;
  description: string;
  cover: string; // path under /static, e.g. /covers/1342.jpg
}

/** Every money movement. Purchases, fines and deposits all live here. */
export interface LedgerEntry {
  at: string;
  username: string;
  type: 'deposit' | 'purchase' | 'fine';
  amount: number; // always positive; type says which way it went
  bookId?: string;
}

export interface View {
  at: string;
  username: string | null; // null = visitor
  bookId: string;
}

export interface Review {
  at: string;
  bookId: string;
  author: string; // username, or "visitor:<id>" for visitors
  stars: number;
  comment: string;
}

export interface JournalEntry {
  id: string;
  at: string;
  bookId: string;
  text: string;
  question?: string;
}

export interface Shelf {
  books: Record<string, 'want' | 'reading' | 'finished'>;
  journal: JournalEntry[];
}

export interface Files {
  users: User[];
  books: Book[];
  ledger: LedgerEntry[];
  views: View[];
  reviews: Review[];
  taboo: string[];
  shelves: Record<string, Shelf>;
  sessions: Record<string, string>; // token -> username
}

const EMPTY: Files = {
  users: [],
  books: [],
  ledger: [],
  views: [],
  reviews: [],
  taboo: [],
  shelves: {},
  sessions: {}
};

export function read<K extends keyof Files>(name: K): Files[K] {
  const file = path.join(DIR, `${name}.json`);
  if (!fs.existsSync(file)) return structuredClone(EMPTY[name]);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function write<K extends keyof Files>(name: K, value: Files[K]): void {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify(value, null, 2));
}
