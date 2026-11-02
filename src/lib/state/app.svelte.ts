/**
 * État de l'application : formulaire (gardé sur l'appareil), réglages,
 * prix du jour et taux EUR/USDC via Binance (opt-in), devise, messages.
 * Le calcul est dérivé du formulaire dans les composants : aucun bouton « Calculer ».
 */
import { defaultForm, type Form, type Mode } from '../core/calc';
import { loadTicker, roundPrice, PriceFetchError } from 'commun-crypto/binance';
import type { Dec } from 'commun-crypto/money';
import { convertAmounts, eurUsdcRate, FX_PAIR, isCurrency, priceIn, rateText, readAmount, SYMBOL, type Currency } from '../core/currency';
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
    } else if (key === 'currency') {
      if (isCurrency(v)) base.currency = v;
    } else if (typeof v === 'string') base[key] = v.slice(0, 40);
  }
  return base;
}

const toInput = (d: Dec) => d.toFixed().replace('.', ',');
const BAD_RESPONSE = 'Réponse de Binance illisible.';

class AppState {
  private readonly storage = openLocalStore('renfort-crypto:');
  readonly persistent = this.storage.persistent;

  form = $state<Form>(defaultForm());
  settings = $state<Settings>({ theme: 'auto', allowPriceFetch: false });
  /** Le scénario vient d'un lien de partage (affiché une fois). */
  fromShare = $state(false);

  /** Demande de consentement en cours, et ce qu'elle débloquera. */
  consentFor = $state<'price' | 'rate' | null>(null);

  priceStatus = $state<'idle' | 'loading' | 'error'>('idle');
  priceMessage = $state<string | null>(null);
  /** Chemin de conversion du dernier prix récupéré, ex. « BTCEUR ». */
  priceRoute = $state<string | null>(null);

  rateStatus = $state<'idle' | 'loading' | 'error'>('idle');
  rateMessage = $state<string | null>(null);
  /** Le taux affiché vient de Binance (effacé dès qu'on le modifie). */
  rateFromBinance = $state(false);

  /** Changement de devise en attente d'un taux (D-019). */
  currencyPrompt = $state<Currency | null>(null);
  private switchAfterRate: Currency | null = null;

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
    this.rateFromBinance = false;
    this.currencyPrompt = null;
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
    this.rateFromBinance = false;
    this.rateMessage = null;
    this.currencyPrompt = null;
    this.notify('Formulaire effacé.');
  }

  setTheme(theme: Theme) {
    this.settings.theme = theme;
    this.storage.writeJson(SETTINGS_KEY, this.settings);
  }

  setConsent(allow: boolean) {
    this.settings.allowPriceFetch = allow;
    this.storage.writeJson(SETTINGS_KEY, this.settings);
    if (!allow) this.consentFor = null;
  }

  /** Taux saisi, s'il est lisible et positif. */
  get rate(): Dec | null {
    try {
      const r = readAmount(this.form.fx);
      return r && r.gt(0) ? r : null;
    } catch {
      return null;
    }
  }

  // ---------- Devise (D-019) ----------

  /** Choix de la devise : convertit les montants si un taux est connu, sinon demande quoi faire. */
  setCurrency(to: Currency) {
    if (to === this.form.currency) {
      this.currencyPrompt = null;
      return;
    }
    const rate = this.rate;
    if (rate) this.convertTo(to, rate);
    else this.currencyPrompt = to;
  }

  private convertTo(to: Currency, rate: Dec) {
    const from = this.form.currency;
    if (from === to) return;
    const { form, converted } = convertAmounts(this.form, from, to, rate);
    this.form = { ...form, currency: to };
    if (this.priceRoute) this.priceRoute = `${this.priceRoute} ${from === 'EUR' ? '×' : '÷'} ${FX_PAIR}`;
    this.currencyPrompt = null;
    this.notify(converted ? `Montants convertis en ${SYMBOL[to]} au taux ${rateText(rate)}.` : `Devise : ${SYMBOL[to]}.`);
  }

  /** L'utilisateur indique que ses montants sont déjà dans la nouvelle devise. */
  switchWithoutConverting() {
    const to = this.currencyPrompt;
    if (!to) return;
    this.form.currency = to;
    this.priceRoute = null;
    this.currencyPrompt = null;
    this.notify(`Devise : ${SYMBOL[to]}. Montants inchangés.`);
  }

  cancelCurrencyPrompt() {
    this.currencyPrompt = null;
    this.switchAfterRate = null;
  }

  // ---------- Binance : prix du jour et taux ----------

  /** « Prix du jour » : demande le consentement la première fois. */
  requestPrice() {
    if (!this.settings.allowPriceFetch) {
      this.consentFor = 'price';
      return;
    }
    void this.fetchPrice();
  }

  /** « Taux du jour » ; `thenSwitchTo` : changement de devise à faire une fois le taux connu. */
  requestRate(thenSwitchTo: Currency | null = null) {
    this.switchAfterRate = thenSwitchTo;
    if (!this.settings.allowPriceFetch) {
      this.consentFor = 'rate';
      return;
    }
    void this.fetchRate();
  }

  acceptAndFetch() {
    const what = this.consentFor;
    this.setConsent(true);
    this.consentFor = null;
    void (what === 'rate' ? this.fetchRate() : this.fetchPrice());
  }

  cancelConsent() {
    this.consentFor = null;
    this.switchAfterRate = null;
  }

  /** Taux EUR/USDC de la table des cours : renseigné s'il est vide, venait déjà de Binance, ou s'il est demandé. */
  private takeRate(ticker: Map<string, Dec | null>, force: boolean): Dec | null {
    const rate = eurUsdcRate(ticker);
    if (rate && (force || this.form.fx.trim() === '' || this.rateFromBinance)) {
      this.form.fx = toInput(rate);
      this.rateFromBinance = true;
      this.rateStatus = 'idle';
      this.rateMessage = null;
    }
    return rate;
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
      const ticker = await loadTicker();
      this.takeRate(ticker, false);
      const currency = this.form.currency;
      const quote = priceIn(currency, asset, ticker);
      if (!quote) {
        this.priceStatus = 'error';
        this.priceMessage =
          currency === 'EUR'
            ? `${asset} n’a pas de cours sur Binance (paires EUR, USDT, USDC ou BTC). Saisissez le prix à la main.`
            : `${asset} n’a pas de cours en dollars sur Binance (paires USDC, USDT ou via l’euro). Saisissez le prix à la main.`;
        return;
      }
      this.form.price = toInput(roundPrice(quote.price));
      this.priceRoute = quote.route;
      this.priceStatus = 'idle';
      this.notify(`Prix de ${asset} mis à jour depuis Binance.`);
    } catch (e) {
      this.priceStatus = 'error';
      this.priceMessage = `${e instanceof PriceFetchError ? e.message : BAD_RESPONSE} Saisissez le prix à la main.`;
    }
  }

  async fetchRate() {
    this.rateStatus = 'loading';
    this.rateMessage = null;
    const then = this.switchAfterRate;
    this.switchAfterRate = null;
    try {
      const rate = this.takeRate(await loadTicker(), true);
      if (!rate) {
        this.rateStatus = 'error';
        this.rateMessage = `Paire ${FX_PAIR} introuvable sur Binance. Saisissez le taux à la main.`;
        return;
      }
      if (then) this.convertTo(then, rate);
      else this.notify(`Taux mis à jour depuis Binance : ${rateText(rate)}.`);
    } catch (e) {
      this.rateStatus = 'error';
      this.rateMessage = `${e instanceof PriceFetchError ? e.message : BAD_RESPONSE} Saisissez le taux à la main.`;
    }
  }

  notify(message: string) {
    this.toast = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 3500);
  }
}

export const app = new AppState();
