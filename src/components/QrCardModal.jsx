import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Share2, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Modal, ModalHeader } from './ui';
import { pick, subcategoryName } from '../lib/utils';

export const listingUrl = (id) => `https://sospro24.com/?ad=${encodeURIComponent(id)}`;

/* Biglietto da visita con QR dell'annuncio (funzione Premium per le professioniste).
   Disegnato su canvas: si può salvare come immagine o condividere. */
export default function QrCardModal({ t, lang, listing, onClose, onToast }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const url = listingUrl(listing.id);

  useEffect(() => {
    let alive = true;
    (async () => {
      const W = 1080, H = 1350;
      const c = canvasRef.current;
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#2563eb';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffffff';
      roundRect(g, 70, 70, W - 140, H - 140, 48);
      g.fill();

      g.fillStyle = '#0f172a';
      g.textAlign = 'center';
      g.font = '800 64px Inter, system-ui, sans-serif';
      wrap(g, listing.name, W / 2, 190, W - 240, 72, 2);
      g.fillStyle = '#2563eb';
      g.font = '700 40px Inter, system-ui, sans-serif';
      wrap(g, subcategoryName(listing.categoryId, listing.subcategoryId, lang), W / 2, 330, W - 240, 48, 1);
      g.fillStyle = '#475569';
      g.font = '500 36px Inter, system-ui, sans-serif';
      wrap(g, `${listing.city} · ${listing.zone}`, W / 2, 395, W - 240, 44, 1);

      const qr = document.createElement('canvas');
      await QRCode.toCanvas(qr, url, { width: 560, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } });
      if (!alive) return;
      g.drawImage(qr, (W - 560) / 2, 450);

      g.fillStyle = '#0f172a';
      g.font = '700 40px Inter, system-ui, sans-serif';
      g.fillText(t.qrScan, W / 2, 1090);
      g.fillStyle = '#334155';
      g.font = '500 30px Inter, system-ui, sans-serif';
      wrap(g, pick(listing.titles, lang), W / 2, 1145, W - 260, 38, 2);
      g.fillStyle = '#2563eb';
      g.font = '800 38px Inter, system-ui, sans-serif';
      g.fillText('sospro24.com', W / 2, 1245);
      setReady(true);
    })();
    return () => { alive = false; };
  }, [listing, lang, t.qrScan, url]);

  const fileName = `sospro24-${listing.name.replace(/[^\w-]+/g, '-').toLowerCase()}.png`;

  const share = async () => {
    const text = `${listing.name} — ${pick(listing.titles, lang)}`;
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: listing.name, text, url, dialogTitle: t.shareAd });
      } else if (navigator.share) {
        await navigator.share({ title: listing.name, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        onToast(t.linkCopied);
      }
    } catch {
      // condivisione annullata
    }
  };

  const save = async () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (Capacitor.isNativePlatform()) {
      // Nell'app l'immagine si salva o si invia dal foglio di condivisione di sistema
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title: listing.name });
      } catch {
        // ripiego sotto
      }
      return share();
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();
    return undefined;
  };

  return (
    <Modal onClose={onClose} title={t.qrCardTitle} maxWidth="max-w-md" z="z-[60]">
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={t.qrCardTitle} icon={<QrCode className="w-5 h-5 text-blue-600" />} />
      <div className="p-5 sm:p-6 space-y-4">
        <p className="text-xs text-slate-600">{t.qrCardHint}</p>
        <canvas ref={canvasRef} className="w-full h-auto rounded-2xl border border-slate-200" aria-label={t.qrCardTitle} role="img" />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={share} className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-1.5">
            <Share2 className="w-4 h-4" /> {t.shareAd}
          </button>
          <button type="button" disabled={!ready} onClick={save} className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
            <Download className="w-4 h-4" /> {t.downloadQr}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Testo centrato su più righe, al massimo maxLines (l'ultima con i puntini se serve)
function wrap(g, text, x, y, maxW, lineH, maxLines) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = shown[maxLines - 1];
    while (g.measureText(`${last}…`).width > maxW && last.length) last = last.slice(0, -1);
    shown[maxLines - 1] = `${last}…`;
  }
  shown.forEach((l, i) => g.fillText(l, x, y + i * lineH));
}
