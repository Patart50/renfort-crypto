// Repris de dca-crypto (commit 9414232, src/lib/state/storage.ts), préfixe adapté.
/**
 * Stockage local (localStorage). Tout passe par ici : une erreur de stockage
 * (navigation privée, quota) ne doit jamais casser l'application.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export const PREFIX = 'renfort-crypto:';

/** Mémoire de repli quand localStorage est indisponible. */
export class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  get length() {
    return this.data.size;
  }
}

/** localStorage s'il fonctionne, sinon une mémoire (perdue à la fermeture). */
export function openStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    const ls = globalThis.localStorage;
    const probe = `${PREFIX}probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { store: ls, persistent: true };
  } catch {
    return { store: new MemoryStore(), persistent: false };
  }
}

export function readJson<T>(store: KeyValueStore, key: string): T | null {
  try {
    const raw = store.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

/** Écrit une valeur ; renvoie false si le stockage a refusé (quota plein…). */
export function writeJson(store: KeyValueStore, key: string, value: unknown): boolean {
  try {
    store.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(store: KeyValueStore, key: string): void {
  try {
    store.removeItem(PREFIX + key);
  } catch {
    // rien à faire
  }
}

/** Clés de l'application (sans le préfixe) commençant par `start`. */
export function keysWith(store: KeyValueStore, start: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k?.startsWith(PREFIX + start)) out.push(k.slice(PREFIX.length));
  }
  return out;
}
