// Crea o modifica un annuncio per conto di un professionista (iscrizione assistita)
import React, { useState } from 'react';
import { Modal, Btn, Field, inputCls } from './ui';
import { COUNTRIES, CATEGORIES, LANGUAGES } from '../data';
import { currencyOf } from '../lib/utils';
import * as api from './api';

const COUNTRY_OPTS = COUNTRIES.filter((c) => c.code !== 'ALL');
const LANG_LABEL = { it: 'Italiano', en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch' };

export default function ListingFormModal({ owner, listing, onClose, onSaved, toast }) {
  const l = listing || {};
  const [f, setF] = useState({
    id: l.id || '',
    owner_id: l.owner_id || owner?.id,
    name: l.name || owner?.name || '',
    country: l.country || owner?.country || 'IT',
    city: l.city || owner?.city || '',
    zone: l.zone || '',
    category_id: l.category_id || CATEGORIES[0].id,
    subcategory_id: l.subcategory_id || CATEGORIES[0].subcategories[0].id,
    title: l.title || '',
    description: l.description || '',
    hourly_rate: l.hourly_rate ?? '',
    call_out_fee: l.call_out_fee ?? 0,
    phone: l.phone || '',
    languages: l.languages || ['Italiano'],
    skills: (l.skills || []).join(', '),
    sos_available: !!l.sos_available,
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const cat = CATEGORIES.find((c) => c.id === f.category_id) || CATEGORIES[0];
  const cities = COUNTRY_OPTS.find((c) => c.code === f.country)?.cities || [];
  const zones = cities.find((c) => c.id === f.city)?.zones || [];

  const errors = [
    f.name.trim().length < 2 && 'nome',
    !f.city.trim() && 'città',
    f.title.trim().length < 3 && 'titolo (min 3)',
    f.description.trim().length < 10 && 'descrizione (min 10)',
    !(Number(f.hourly_rate) > 0) && 'tariffa oraria',
    f.phone && !/^\+?[0-9 ().-]{8,22}$/.test(f.phone) && 'telefono',
  ].filter(Boolean);

  const save = async () => {
    setBusy(true);
    try {
      await api.saveListing({
        ...f,
        zone: f.zone || f.city,
        currency: currencyOf(f.country),
        skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12),
        hourly_rate: Number(f.hourly_rate),
        call_out_fee: Number(f.call_out_fee) || 0,
      });
      onSaved();
    } catch (e) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal title={f.id ? 'Modifica annuncio' : `Nuovo annuncio per ${owner?.name || owner?.email || 'account'}`} onClose={onClose} wide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nome mostrato"><input className={inputCls} value={f.name} onChange={set('name')} maxLength={80} /></Field>
        <Field label="Telefono / WhatsApp" hint="Visibile solo agli utenti registrati"><input className={inputCls} value={f.phone} onChange={set('phone')} placeholder="+39 …" /></Field>
        <Field label="Paese">
          <select className={inputCls} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value, city: '', zone: '' })}>
            {COUNTRY_OPTS.map((c) => <option key={c.code} value={c.code}>{c.names.it}</option>)}
          </select>
        </Field>
        <Field label="Città">
          <input className={inputCls} list="lf-cities" value={f.city} onChange={set('city')} maxLength={80} />
          <datalist id="lf-cities">{cities.map((c) => <option key={c.id} value={c.id} />)}</datalist>
        </Field>
        <Field label="Zona / quartiere" hint="Se vuota si usa la città">
          <input className={inputCls} list="lf-zones" value={f.zone} onChange={set('zone')} maxLength={80} />
          <datalist id="lf-zones">{zones.map((z) => <option key={z} value={z} />)}</datalist>
        </Field>
        <Field label="Categoria">
          <select className={inputCls} value={f.category_id} onChange={(e) => { const c = CATEGORIES.find((x) => x.id === e.target.value); setF({ ...f, category_id: c.id, subcategory_id: c.subcategories[0].id }); }}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.names.it}</option>)}
          </select>
        </Field>
        <Field label="Servizio">
          <select className={inputCls} value={f.subcategory_id} onChange={set('subcategory_id')}>
            {cat.subcategories.map((s) => <option key={s.id} value={s.id}>{s.names.it}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Tariffa oraria (${currencyOf(f.country)})`}><input type="number" min="1" className={inputCls} value={f.hourly_rate} onChange={set('hourly_rate')} /></Field>
          <Field label="Uscita"><input type="number" min="0" className={inputCls} value={f.call_out_fee} onChange={set('call_out_fee')} /></Field>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        <Field label={`Titolo (${f.title.length}/110)`}><input className={inputCls} value={f.title} onChange={set('title')} maxLength={110} /></Field>
        <Field label={`Descrizione (${f.description.length}/800)`}><textarea className={inputCls} rows={5} value={f.description} onChange={set('description')} maxLength={800} /></Field>
        <Field label="Competenze" hint="Separate da virgole, massimo 12"><input className={inputCls} value={f.skills} onChange={set('skills')} /></Field>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-xs font-bold text-slate-700 w-full">Lingue parlate</span>
          {LANGUAGES.map(({ code }) => {
            const name = LANG_LABEL[code];
            const on = f.languages.includes(name);
            return (
              <label key={code} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={on} onChange={() => setF({ ...f, languages: on ? f.languages.filter((x) => x !== name) : [...f.languages, name] })} />
                {name}
              </label>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={f.sos_available} onChange={set('sos_available')} /> Disponibile per urgenze SOS 24/7
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        {errors.length > 0 && <span className="text-xs text-rose-700 mr-auto">Da completare: {errors.join(', ')}</span>}
        <Btn variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn onClick={save} disabled={busy || errors.length > 0 || !f.owner_id}>{busy ? 'Salvo…' : 'Salva annuncio'}</Btn>
      </div>
    </Modal>
  );
}
