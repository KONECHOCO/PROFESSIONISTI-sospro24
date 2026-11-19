import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, ShieldCheck, Zap, PlusCircle, User, Globe, Filter, AlertTriangle, Wrench,
  HeartHandshake, Sparkles, Laptop, X, FileText, ArrowUpDown, Info, Siren, LocateFixed,
} from 'lucide-react';
import Flag from './components/Flag';
import { LANGUAGES, COUNTRIES, CATEGORIES, UI_TEXT } from './data';
import { INITIAL_LISTINGS } from './data/mockListings';
import ListingCard from './components/ListingCard';
import ListingModal from './components/ListingModal';
import EmptyState from './components/EmptyState';
import { AuthModal, NewPasswordModal, PublishModal, SmartMatchModal, ProfileModal, TermsModal } from './components/Modals';
import { Toast } from './components/ui';
import {
  usePersistentState, loadJSON, normalizeListing, getCityOptions, getZoneOptions,
  pick, categoryName, subcategoryName, detectCountry, nearestCity, getPosition,
} from './lib/utils';
import { supabase, isSupabaseConfigured, SHOW_DEMO } from './lib/supabase';
import * as api from './lib/api';

const CATEGORY_ICONS = { home_sos: Wrench, care_person: HeartHandshake, beauty_events: Sparkles, consulting_tech: Laptop };

const stripAccents = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function detectLanguage() {
  const saved = loadJSON('sospro_lang', null);
  if (LANGUAGES.some((l) => l.code === saved)) return saved;
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'it').slice(0, 2).toLowerCase();
  return LANGUAGES.some((l) => l.code === nav) ? nav : 'it';
}

// Chiavi del vecchio prototipo (tutto salvato nel browser): ora i dati stanno su Supabase
const LEGACY_KEYS = ['sospro_listings_v1', 'sospro_ads_v2', 'sospro_reviews_v2', 'sospro_helpful_v2', 'sospro_reports_v2', 'sospro_user_v1'];

export default function App() {
  /* ------------------------------ Lingua e preferenze locali ------------------------------ */
  const [lang, setLang] = usePersistentState('sospro_lang', detectLanguage());
  const t = UI_TEXT[lang] || UI_TEXT.it;
  const [favorites, setFavorites] = usePersistentState('sospro_favs_v2', []);

  useEffect(() => {
    try { LEGACY_KEYS.forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `SOSPro24 — ${t.brandSubtitle}`;
  }, [lang, t.brandSubtitle]);

  /* ------------------------------ Toast ------------------------------ */
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'ok') => setToast({ message, type, id: Date.now() }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  /* ------------------------------ Account (Supabase Auth) ------------------------------ */
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recovery, setRecovery] = useState(false);
  // Esito del link arrivato via email: 'confirmed' | 'expired' | null
  const [linkNotice, setLinkNotice] = useState(null);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });

    // Link delle email (modelli in supabase/email-templates): ?token_hash=...&type=email|recovery
    // La verifica la fa l'app, così il link punta al nostro sito e non a supabase.co
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const cleanUrl = () => window.history.replaceState(null, '', window.location.pathname);
    if (tokenHash && type) {
      cleanUrl();
      supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
        if (error) setLinkNotice('expired');
        else if (type === 'recovery') setRecovery(true);
        else setLinkNotice('confirmed');
      });
    } else if (hashParams.get('error_code')) {
      // Vecchio formato del link (redirect di Supabase) scaduto o già usato
      cleanUrl();
      setLinkNotice('expired');
    } else if (hashParams.get('type') === 'signup') {
      setLinkNotice('confirmed');
    }
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!linkNotice) return;
    showToast(linkNotice === 'confirmed' ? t.emailConfirmed : t.linkExpired, linkNotice === 'confirmed' ? 'ok' : 'error');
    setLinkNotice(null);
  }, [linkNotice, showToast, t.emailConfirmed, t.linkExpired]);

  const userId = session?.user?.id || null;

  useEffect(() => {
    if (!userId) return setProfile(null);
    let alive = true;
    api.fetchProfile(userId).then((p) => alive && setProfile(p)).catch(() => alive && setProfile(null));
    return () => { alive = false; };
  }, [userId]);

  const currentUser = useMemo(() => {
    if (!session?.user) return null;
    const meta = session.user.user_metadata || {};
    return {
      id: session.user.id,
      email: session.user.email,
      name: profile?.name || meta.name || session.user.email.split('@')[0],
      role: profile?.role || meta.role || 'client',
      country: profile?.country || meta.country || '',
      city: profile?.city || meta.city || '',
    };
  }, [session, profile]);

  /* ------------------------------ Annunci dal database ------------------------------ */
  const [dbListings, setDbListings] = useState([]);
  const [loadState, setLoadState] = useState(isSupabaseConfigured ? 'loading' : 'error');

  const reload = useCallback(async () => {
    if (!supabase) return;
    try {
      setDbListings(await api.fetchListings());
      setLoadState('ok');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const [myVotes, setMyVotes] = useState(() => new Set());
  useEffect(() => {
    if (!userId) return setMyVotes(new Set());
    api.fetchMyVotes().then(setMyVotes).catch(() => setMyVotes(new Set()));
    return undefined;
  }, [userId]);

  const listings = useMemo(
    () => [...dbListings, ...(SHOW_DEMO ? INITIAL_LISTINGS : [])].map((l) => normalizeListing(l)),
    [dbListings]
  );

  /* ------------------------------ Filtri ------------------------------ */
  const [searchQuery, setSearchQuery] = useState('');
  // Paese preselezionato dalle impostazioni del dispositivo (fuso orario / lingua); 'ALL' se non supportato
  const [selectedCountry, setSelectedCountry] = useState(detectCountry);
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState('ALL');
  const [onlySos, setOnlySos] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');

  const cityOptions = useMemo(() => getCityOptions(selectedCountry, listings), [selectedCountry, listings]);
  const zoneOptions = useMemo(() => getZoneOptions(selectedCity, listings), [selectedCity, listings]);
  const subcategoryOptions = useMemo(
    () => (selectedCategory === 'ALL' ? CATEGORIES.flatMap((c) => c.subcategories) : CATEGORIES.find((c) => c.id === selectedCategory)?.subcategories || []),
    [selectedCategory]
  );
  const hasVerified = listings.some((l) => l.verified);
  const hasFilters =
    searchQuery || selectedCountry !== 'ALL' || selectedCity !== 'ALL' || selectedZone !== 'ALL' ||
    selectedCategory !== 'ALL' || selectedSubcategory !== 'ALL' || onlySos || onlyVerified;

  const resetAllFilters = useCallback(() => {
    setSearchQuery(''); setSelectedCountry('ALL'); setSelectedCity('ALL'); setSelectedZone('ALL');
    setSelectedCategory('ALL'); setSelectedSubcategory('ALL'); setOnlySos(false); setOnlyVerified(false); setSortBy('recommended');
  }, []);

  const filteredListings = useMemo(() => {
    const q = stripAccents(searchQuery.trim());
    return listings
      .filter((item) => {
        if (selectedCountry !== 'ALL' && item.country !== selectedCountry) return false;
        if (selectedCity !== 'ALL' && item.city !== selectedCity) return false;
        if (selectedZone !== 'ALL' && item.zone !== selectedZone) return false;
        if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
        if (selectedSubcategory !== 'ALL' && item.subcategoryId !== selectedSubcategory) return false;
        if (onlySos && !item.sosAvailable) return false;
        if (onlyVerified && !item.verified) return false;
        if (q) {
          // Cerca anche nei nomi (tradotti) di categoria e servizio, così "plumber" o "idraulico" funzionano in ogni lingua
          const haystack = stripAccents(
            [
              item.name, item.city, item.zone, pick(item.titles, lang), pick(item.descriptions, lang),
              item.skills.join(' '), categoryName(item.categoryId, lang), subcategoryName(item.categoryId, item.subcategoryId, lang),
            ].join(' ')
          );
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ra = a.rating ?? 0, rb = b.rating ?? 0;
        if (sortBy === 'rating') return rb - ra || b.reviewsCount - a.reviewsCount;
        if (sortBy === 'price_asc') return a.hourlyRate - b.hourlyRate;
        if (sortBy === 'fastest') return (a.responseTimeMin ?? 9999) - (b.responseTimeMin ?? 9999);
        if (a.sosAvailable !== b.sosAvailable) return a.sosAvailable ? -1 : 1;
        return rb - ra || b.reviewsCount - a.reviewsCount;
      });
  }, [listings, selectedCountry, selectedCity, selectedZone, selectedCategory, selectedSubcategory, onlySos, onlyVerified, searchQuery, sortBy, lang]);

  /* ------------------------------ Finestre ------------------------------ */
  const [activeListingId, setActiveListingId] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authNext, setAuthNext] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSmartMatch, setShowSmartMatch] = useState(false);

  const activeListing = useMemo(() => listings.find((l) => l.id === activeListingId) || null, [listings, activeListingId]);

  // "Vicino a me": chiede la posizione al browser (con permesso) e sceglie la città più vicina
  // tra quelle dell'elenco. Il calcolo è locale: nessuna coordinata viene inviata a servizi esterni.
  const [locating, setLocating] = useState(false);
  const findNearMe = async () => {
    setLocating(true);
    try {
      const pos = await getPosition();
      const near = nearestCity(pos.lat, pos.lng);
      if (!near) {
        showToast(t.nearMeFar, 'error');
      } else {
        setSelectedCountry(near.country);
        setSelectedCity(near.city);
        setSelectedZone('ALL');
      }
    } catch {
      showToast(t.nearMeError, 'error');
    } finally {
      setLocating(false);
    }
  };

  /* ------------------------------ Accesso ------------------------------ */
  const requireAuth = (callback) => {
    if (currentUser) return callback();
    setAuthNext(() => callback);
    setShowAuth(true);
    return undefined;
  };

  const handleSignedIn = () => {
    setShowAuth(false);
    showToast(t.loggedIn);
    if (authNext) {
      const next = authNext;
      setAuthNext(null);
      next();
    }
  };

  const logout = async () => {
    await api.signOut();
    setShowProfile(false);
  };

  const toggleRole = async () => {
    if (!currentUser) return;
    const role = currentUser.role === 'pro' ? 'client' : 'pro';
    try {
      await api.updateProfile(currentUser.id, { role });
      setProfile((p) => ({ ...(p || {}), role }));
    } catch {
      showToast(t.actionError, 'error');
    }
  };

  /* ------------------------------ Azioni ------------------------------ */
  const toggleFavorite = (id) => setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addReview = async (listingId, { rating, tags, comment }) => {
    const target = listings.find((l) => l.id === listingId);
    if (!currentUser || !target) return { ok: false };
    if (target.demo) { showToast(t.demoReviewDisabled, 'error'); return { ok: false }; }
    if (target.ownerId === currentUser.id) { showToast(t.reviewOwnAd, 'error'); return { ok: false }; }
    if (target.reviews.some((r) => r.userId === currentUser.id)) { showToast(t.reviewAlready, 'error'); return { ok: false }; }
    if (comment.trim().length < 3) { showToast(t.reviewNeedComment, 'error'); return { ok: false }; }
    try {
      await api.addReview(listingId, { rating, tags, comment });
      await reload();
      showToast(t.reviewPublished);
      return { ok: true };
    } catch (err) {
      showToast(err?.code === '23505' ? t.reviewAlready : t.actionError, 'error');
      return { ok: false };
    }
  };

  const markHelpful = async (listingId, reviewId) => {
    const target = listings.find((l) => l.id === listingId);
    if (target?.demo) return showToast(t.demoReviewDisabled, 'error');
    if (!currentUser) { showToast(t.loginToVote); return setShowAuth(true); }
    if (myVotes.has(reviewId)) return undefined;
    try {
      await api.voteHelpful(reviewId);
      setMyVotes((prev) => new Set(prev).add(reviewId));
      await reload();
    } catch {
      showToast(t.actionError, 'error');
    }
    return undefined;
  };

  const report = async ({ listingId = null, reviewId = null }) => {
    const target = listings.find((l) => l.id === listingId);
    try {
      if (!target?.demo) await api.report({ listingId, reviewId });
      showToast(t.reportSent);
    } catch {
      showToast(t.actionError, 'error');
    }
  };

  const publishAd = async (form) => {
    try {
      const id = await api.createListing(form);
      await reload();
      setShowPublish(false);
      resetAllFilters();
      setSelectedCountry(form.country);
      setActiveListingId(id);
      showToast(t.adPublished);
      return true;
    } catch {
      return false;
    }
  };

  const deleteAd = async (id) => {
    if (!window.confirm(t.deleteAdConfirm)) return;
    try {
      await api.deleteListing(id);
      setFavorites((prev) => prev.filter((x) => x !== id));
      if (activeListingId === id) setActiveListingId(null);
      await reload();
      showToast(t.adDeleted);
    } catch {
      showToast(t.actionError, 'error');
    }
  };

  const openPublish = () => requireAuth(() => { setShowProfile(false); setShowPublish(true); });

  const openListing = (id) => { setShowProfile(false); setShowSmartMatch(false); setActiveListingId(id); };

  const mainFilterLabel = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';
  const selectCls = 'w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Barra emergenze vitali */}
      <div className="bg-red-700 text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-2 justify-center text-center font-semibold">
          <Siren className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">{t.emergencyBar}</span>
          <span className="sm:hidden">{t.emergencyShort}</span>
        </div>
      </div>

      {/* Barra avviso legale + lingua */}
      <div className="bg-slate-900 text-slate-200 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300 hidden md:inline">{t.intermediaryNoticeShort}</span>
            <button type="button" onClick={() => setShowTerms(true)} className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2">
              {t.readTerms}
            </button>
          </div>
          <div className="flex items-center gap-1.5 ml-auto" role="group" aria-label="Language">
            <Globe className="w-3.5 h-3.5 text-slate-400 mr-1" aria-hidden="true" />
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                title={l.label}
                className={`px-2 py-0.5 rounded font-medium transition ${lang === l.code ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={resetAllFilters} className="flex items-center gap-3 group text-left" aria-label="SOSPro24 Global — home">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-slate-900 flex items-center justify-center text-white shadow-md relative">
              <Zap className="w-5 h-5 fill-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white sos-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition">
                  SOSPro<span className="text-blue-600">24</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Global</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">{t.brandSubtitle}</p>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowSmartMatch(true)}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs transition"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 sos-pulse" />
              {t.smartMatchBtn}
            </button>
            <button
              type="button"
              onClick={openPublish}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.publishAdBtn}</span>
            </button>
            {currentUser ? (
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs sm:text-sm font-semibold transition"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{currentUser.name.charAt(0).toUpperCase()}</div>
                <div className="text-left hidden sm:block">
                  <div className="leading-none">{currentUser.name.split(' ')[0]}</div>
                  <div className="text-[10px] text-blue-600 font-medium">{currentUser.role === 'pro' ? t.rolePro : t.roleClient}</div>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition"
              >
                <User className="w-4 h-4" />
                <span>{t.loginRegisterBtn}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero + ricerca */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white pt-8 pb-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">{t.heroBadge}</div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3">{t.heroTitle}</h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{t.heroSubtitle}</p>
          </div>

          <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-2xl border border-slate-200/80">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <label className={mainFilterLabel} htmlFor="f-search">{t.keywordLabel}</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="f-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} aria-label={t.resetFilters} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={mainFilterLabel} htmlFor="f-country">{t.countryLabel}</label>
                <select id="f-country" value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedCity('ALL'); setSelectedZone('ALL'); }} className={selectCls}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{pick(c.names, lang)}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={mainFilterLabel} htmlFor="f-city">{t.cityLabel}</label>
                <select id="f-city" value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); setSelectedZone('ALL'); }} className={selectCls}>
                  <option value="ALL">{t.allCities}</option>
                  {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className={mainFilterLabel} htmlFor="f-zone">{t.zoneLabel}</label>
                <select id="f-zone" value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} disabled={selectedCity === 'ALL'} className={`${selectCls} disabled:opacity-50`}>
                  <option value="ALL">{t.allZones}</option>
                  {zoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={onlySos}
                  onClick={() => setOnlySos(!onlySos)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${onlySos ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${onlySos ? 'bg-white' : 'bg-red-600 sos-pulse'}`} />
                  {t.sosFilterLabel}
                </button>

                {hasVerified && (
                  <button
                    type="button"
                    aria-pressed={onlyVerified}
                    onClick={() => setOnlyVerified(!onlyVerified)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${onlyVerified ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t.verifiedFilterLabel}
                  </button>
                )}

                <select
                  aria-label={t.allSubcategories}
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t.allSubcategories}</option>
                  {subcategoryOptions.map((sub) => <option key={sub.id} value={sub.id}>{pick(sub.names, lang)}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <label htmlFor="f-sort" className="text-xs text-slate-500 font-medium">{t.sortByLabel}</label>
                <select id="f-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none">
                  <option value="recommended">{t.sortRecommended}</option>
                  <option value="rating">{t.sortRating}</option>
                  <option value="price_asc">{t.sortPriceAsc}</option>
                  <option value="fastest">{t.sortFastest}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Categorie */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              type="button"
              onClick={() => { setSelectedCategory('ALL'); setSelectedSubcategory('ALL'); }}
              className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${selectedCategory === 'ALL' ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800'}`}
            >
              <Filter className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">{t.allCategories}</div>
                <div className="text-[10px] opacity-80">{listings.length} {listings.length === 1 ? t.adsCountOne : t.adsCount}</div>
              </div>
            </button>
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id] || Wrench;
              const isSelected = selectedCategory === cat.id;
              const count = listings.filter((l) => l.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => { setSelectedCategory(isSelected ? 'ALL' : cat.id); setSelectedSubcategory('ALL'); }}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${isSelected ? 'bg-blue-600 text-white border-blue-400 shadow-lg' : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800'}`}
                >
                  <Icon className="w-5 h-5 shrink-0 text-blue-300" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-tight">{pick(cat.names, lang)}</div>
                    <div className="text-[10px] opacity-80">{count} {count === 1 ? t.prosCountOne : t.prosCount}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contenuto */}
      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1">
        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm font-semibold">{t.configMissing}</div>
        )}

        {SHOW_DEMO && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-blue-950">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">{t.demoBannerTitle}. </span>
              {t.demoBannerText}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-extrabold text-slate-900" aria-live="polite">
              {loadState === 'loading' ? t.loading : `${filteredListings.length} ${filteredListings.length === 1 ? t.resultsCountOne : t.resultsCount}`}
            </h2>
            {hasFilters && (
              <button type="button" onClick={resetAllFilters} className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline ml-2">{t.resetFilters}</button>
            )}
          </div>
          <div className="flex items-center gap-2 max-w-full">
            <button
              type="button"
              onClick={findNearMe}
              disabled={locating}
              title={t.nearMeNote}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 shrink-0 transition"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-pulse' : ''}`} />
              {t.nearMe}
            </button>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  aria-pressed={selectedCountry === c.code}
                  onClick={() => { setSelectedCountry(c.code); setSelectedCity('ALL'); setSelectedZone('ALL'); }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition shrink-0 ${selectedCountry === c.code ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                >
                  <Flag code={c.code} />
                  {pick(c.names, lang)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadState === 'error' && isSupabaseConfigured && (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-xl mx-auto my-6 shadow-sm">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="text-sm text-slate-700 mb-4">{t.loadError}</p>
            <button type="button" onClick={() => { setLoadState('loading'); reload(); }} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">{t.retry}</button>
          </div>
        )}

        {loadState === 'loading' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-2xl bg-slate-200/70 animate-pulse" />)}
          </div>
        )}

        {loadState === 'ok' && (filteredListings.length === 0 ? (
          <EmptyState
            t={t}
            lang={lang}
            country={selectedCountry}
            city={selectedCity}
            categoryId={selectedCategory}
            hasFilters={hasFilters}
            onReset={resetAllFilters}
            onPublish={openPublish}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((pro) => (
              <ListingCard
                key={pro.id}
                pro={pro}
                lang={lang}
                t={t}
                isFav={favorites.includes(pro.id)}
                onToggleFav={toggleFavorite}
                onOpen={setActiveListingId}
                onContact={(id) => requireAuth(() => setActiveListingId(id))}
              />
            ))}
          </div>
        ))}

        <section className="mt-12 bg-amber-50/90 border border-amber-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5"><FileText className="w-6 h-6" /></div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-amber-950 mb-1">{t.disclaimerBoxTitle}</h3>
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-4xl">{t.disclaimerBoxText}</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowTerms(true)} className="px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold shrink-0 transition">{t.readTerms}</button>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 px-4 border-t border-slate-800 mt-12 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Zap className="w-4 h-4 text-blue-400 shrink-0" />
            <span><span className="font-bold text-white">SOSPro24 Global</span> — {t.footerCopy}</span>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setShowTerms(true)} className="hover:text-white underline">{t.readTerms}</button>
            {!currentUser && <button type="button" onClick={() => setShowAuth(true)} className="hover:text-white underline">{t.loginRegisterBtn}</button>}
          </div>
        </div>
      </footer>

      {/* Pulsante SOS flottante su mobile (nel header è nascosto sotto i 768px) */}
      <button
        type="button"
        onClick={() => setShowSmartMatch(true)}
        className="md:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-xl"
      >
        <span className="w-2 h-2 rounded-full bg-white sos-pulse" />
        SOS
      </button>

      {/* Finestre */}
      {activeListing && (
        <ListingModal
          key={activeListing.id}
          listing={activeListing}
          lang={lang}
          t={t}
          currentUser={currentUser}
          myVotes={myVotes}
          loadContact={api.fetchContact}
          onClose={() => setActiveListingId(null)}
          onLogin={() => setShowAuth(true)}
          onAddReview={addReview}
          onHelpful={markHelpful}
          onReportReview={(listingId, reviewId) => report({ listingId, reviewId })}
          onReportAd={(listingId) => report({ listingId })}
          onToast={showToast}
        />
      )}

      {showAuth && (
        <AuthModal
          lang={lang}
          t={t}
          defaultCountry={selectedCountry}
          onClose={() => { setShowAuth(false); setAuthNext(null); }}
          onShowTerms={() => setShowTerms(true)}
          onSignedIn={handleSignedIn}
        />
      )}

      {recovery && (
        <NewPasswordModal
          t={t}
          onClose={() => setRecovery(false)}
          onDone={() => { setRecovery(false); showToast(t.passwordUpdated); }}
        />
      )}

      {showPublish && currentUser && (
        <PublishModal lang={lang} t={t} user={currentUser} defaultCountry={selectedCountry} onClose={() => setShowPublish(false)} onShowTerms={() => setShowTerms(true)} onPublish={publishAd} />
      )}

      {showSmartMatch && (
        <SmartMatchModal
          lang={lang}
          t={t}
          listings={listings}
          defaultCountry={selectedCountry}
          onClose={() => setShowSmartMatch(false)}
          onOpen={openListing}
          onShowAll={(country, category) => {
            resetAllFilters();
            setSelectedCountry(country);
            setSelectedCategory(category);
            setOnlySos(true);
            setShowSmartMatch(false);
          }}
        />
      )}

      {showProfile && currentUser && (
        <ProfileModal
          lang={lang}
          t={t}
          user={currentUser}
          listings={listings}
          favorites={favorites}
          onClose={() => setShowProfile(false)}
          onOpen={openListing}
          onPublish={openPublish}
          onToggleRole={toggleRole}
          onLogout={logout}
          onDeleteAd={deleteAd}
        />
      )}

      {showTerms && <TermsModal lang={lang} t={t} onClose={() => setShowTerms(false)} />}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
