import {
  LANGUAGES,
  COUNTRIES,
  CATEGORIES,
  FEEDBACK_TAGS,
  UI_TEXT as BASE_TEXT,
  LEGAL_SECTIONS as BASE_LEGAL,
} from './i18n';
import { EXTRA_TEXT, LEGAL_EXTRA } from './i18nExtra';
import { APP_TEXT } from './i18nApp';

export { LANGUAGES, COUNTRIES, CATEGORIES, FEEDBACK_TAGS };

// Italiano come lingua di riserva: se una chiave manca in una lingua si vede il testo italiano, mai "undefined".
export const UI_TEXT = Object.fromEntries(
  LANGUAGES.map(({ code }) => [
    code,
    { ...BASE_TEXT.it, ...EXTRA_TEXT.it, ...APP_TEXT.it, ...BASE_TEXT[code], ...EXTRA_TEXT[code], ...APP_TEXT[code] },
  ])
);

export const LEGAL_SECTIONS = Object.fromEntries(
  LANGUAGES.map(({ code }) => [code, [...(BASE_LEGAL[code] || BASE_LEGAL.it), ...(LEGAL_EXTRA[code] || LEGAL_EXTRA.it)]])
);
