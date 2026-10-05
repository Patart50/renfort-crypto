/**
 * État de l'application : formulaire (gardé sur l'appareil), réglages,
 * prix du jour Binance (opt-in), messages. Le calcul est dérivé du formulaire
 * dans les composants : aucun bouton « Calculer ».
 */
import { defaultForm, type Form, type Mode } from '../core/calc';
import { loadTicker, priceEur, roundPrice, PriceFetchError } from 'commun-crypto/binance';
import { readShareFragment } from '../export/scenario';
import { openLocalStore } from 'commun-crypto/storage';
import { isTheme, type Theme } from 'commun-crypto/theme';

export type { Theme };

export interface Settings {
  theme: Theme;
  /** Consentement aux appels à l'API publique de Binance (D-004 : opt-in, mémorisé, révocable). */
  allowPriceFetch: boolean;
}

const SETTINGS_KEY = 'reglages';
const FORM_KEY = 'formulaire';
const MODES: readonly Mode[] = ['target', 'budget'];

/** Formulaire relu depuis le stockage ou un lien : champs inconnus ignorés, chaînes seulement. */
function sanitize(raw: unknown): Form | null {
  if (!raw || typeof raw !== 'object') return null;
  const base = defaultForm();
  const src = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof Form)[]) {
    const v = src[key];
    if (key === 'mode') {
      if (MODES.includes(v as Mode)) base.mode = v as Mode;
    } else if (typeof v === 'string') base[key] = v.slice(0, 40);
  }
  return base;
}

class AppState {
  private readonly storage = openLocalStore('renfort-crypto:');
  readonly persistent = this.storage.persistent;

  form = $state<Form>(defaultForm());
  settings = $state<Settings>({ theme: 'auto', allowPriceFetch: false });
  /** Le scénario vient d'un lien de partage (affiché une fois). */
  fromShare = $state(false);

  priceStatus = $state<'idle' | 'consent' | 'loading' | 'error'>('idle');
  priceMessage = $state<string | null>(null);
  /** Chemin de conversion du dernier prix récupéré, ex. « BTCEUR ». */
  priceRoute = $state<string | null>(null);

  toast = $state<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  init(hash = location.hash) {
    const saved = this.storage.readJson<Partial<Settings>>(SETTINGS_KEY);
    if (isTheme(saved?.theme)) this.settings.theme = saved.theme;
    if (saved?.allowPriceFetch === true) this.settings.allowPriceFetch = true;

    if (!this.openShare(hash)) {
      const form = sanitize(this.storage.readJson(FORM_KEY));
      if (form) this.form = form;
    }
  }

  /** Ouvre un lien de partage (D-014) ; false si le fragment n'en est pas un. */
  openShare(hash: string): boolean {
    const shared = readShareFragment(hash);
    if (!shared) return false;
    this.form = shared;
    this.fromShare = true;
    this.priceRoute = null;
    // Le lien a servi : on le retire de la barre d'adresse (il contient la position).
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  }

  saveForm() {
    this.storage.writeJson(FORM_KEY, this.form);
  }

  resetForm() {
    this.form = defaultForm();
    this.storage.remove(FORM_KEY);
    this.priceRoute = null;
    this.priceMessage = null;
    this.notify('Formulaire effacé.');
  }

  setTheme(theme: Theme) {
    this.settings.theme = theme;
    this.storage.writeJson(SETTINGS_KEY, this.settings);
  }

  setConsent(allow: boolean) {
    this.settings.allowPriceFetch = allow;
    this.storage.writeJson(SETTINGS_KEY, this.settings);
    if (!allow && this.priceStatus === 'consent') this.priceStatus = 'idle';
  }

  /** « Prix du jour via Binance » : demande le consentement la première fois. */
  requestPrice() {
    if (!this.settings.allowPriceFetch) {
      this.priceStatus = 'consent';
      return;
    }
    void this.fetchPrice();
  }

  acceptAndFetch() {
    this.setConsent(true);
    void this.fetchPrice();
  }

  cancelConsent() {
    this.priceStatus = 'idle';
  }

  async fetchPrice() {
    const asset = this.form.asset.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,15}$/.test(asset)) {
      this.priceStatus = 'error';
      this.priceMessage = 'Indiquez d’abord la crypto (ex. BTC).';
      return;
    }
    this.priceStatus = 'loading';
    this.priceMessage = null;
    try {
      const quote = priceEur(asset, await loadTicker());
      if (!quote) {
        this.priceStatus = 'error';
        this.priceMessage = `${asset} n’a pas de cours sur Binance (paires EUR, USDT, USDC ou BTC). Saisissez le prix à la main.`;
        return;
      }
      this.form.price = roundPrice(quote.price).toFixed().replace('.', ',');
      this.priceRoute = quote.route;
      this.priceStatus = 'idle';
      this.notify(`Prix de ${asset} mis à jour depuis Binance.`);
    } catch (e) {
      this.priceStatus = 'error';
      this.priceMessage = e instanceof PriceFetchError ? e.message : 'Réponse de Binance illisible. Saisissez le prix à la main.';
    }
  }

  notify(message: string) {
    this.toast = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 3000);
  }
}

export const app = new AppState();
