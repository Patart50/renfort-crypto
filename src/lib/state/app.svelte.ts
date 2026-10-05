/**
 * État de l'application. J1 : réglages (thème) seulement ; le formulaire et
 * les résultats arrivent au J2. Persisté en localStorage.
 */
import { openStore, readJson, writeJson } from './storage';

export type Theme = 'auto' | 'light' | 'dark';

export interface Settings {
  theme: Theme;
}

const SETTINGS_KEY = 'reglages';
const THEMES: readonly Theme[] = ['auto', 'light', 'dark'];

class AppState {
  private readonly storage = openStore();
  readonly persistent = this.storage.persistent;

  settings = $state<Settings>({ theme: 'auto' });

  init() {
    const saved = readJson<Partial<Settings>>(this.storage.store, SETTINGS_KEY);
    if (saved?.theme && THEMES.includes(saved.theme)) this.settings.theme = saved.theme;
  }

  setTheme(theme: Theme) {
    this.settings.theme = theme;
    writeJson(this.storage.store, SETTINGS_KEY, this.settings);
  }
}

export const app = new AppState();
