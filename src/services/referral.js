// Programma ambasciatori Ikonet: configurazione per SOSPro24 (logica comune in referral-core.js).
// La chiave identifica l'app verso partner.ikonetsolutions.com, non è un segreto.
import { Capacitor } from '@capacitor/core';
import { configureReferral, getReferralState, canEnterCode } from './referral-core.js';

export const APP_VERSION = '1.0.0';

configureReferral({
  api: 'https://partner.ikonetsolutions.com',
  key: 'YRbn47O_AHzIiCAwIG1G9mraSEOKePKr',
  appId: 'sospro24',
  appVersion: APP_VERSION,
});

export * from './referral-core.js';

/** Il campo codice invito compare solo nell'app, nei primi 7 giorni e finché non è stato usato un codice. */
export const showReferralField = () => Capacitor.isNativePlatform() && canEnterCode(getReferralState());
