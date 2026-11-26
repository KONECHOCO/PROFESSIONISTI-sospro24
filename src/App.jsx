import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, ShieldCheck, Zap, PlusCircle, User, Globe, Filter, AlertTriangle, Wrench,
  HeartHandshake, Sparkles, Laptop, X, FileText, ArrowUpDown, Info, Siren, LocateFixed,
  Crown, Settings, BookmarkPlus, Bookmark, Megaphone, Briefcase,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import Flag from './components/Flag';
import { LANGUAGES, COUNTRIES, CATEGORIES, UI_TEXT } from './data';
import { INITIAL_LISTINGS } from './data/mockListings';
import ListingCard from './components/ListingCard';
import ListingModal from './components/ListingModal';
import EmptyState from './components/EmptyState';
import { AuthModal, NewPasswordModal, PublishModal, SmartMatchModal, ProfileModal, TermsModal } from './components/Modals';
import { Toast } from './components/ui';
import { PremiumModal, AdSpacer, AdDiagnostics } from './components/Premium';
import SettingsModal from './components/SettingsModal';
import QrCardModal from './components/QrCardModal';
import { RequestCard, RequestModal, PublishRequestModal, RequestCta } from './components/Requests';
import { initMonetization, trackAdAction, toggleTestAds, useMonetization, hasPremium } from './services/monetization';
import { initReferral } from './services/referral';
import {
  usePersistentState, loadJSON, normalizeListing, getCityOptions, getZoneOptions,
  pick, categoryName, subcategoryName, detectCountry, nearestCity, getPosition, countryName,
} from './lib/utils';
import { supabase, isSupabaseConfigured, SHOW_DEMO } from './lib/supabase';
import * as api from './lib/api';

const CATEGORY_ICONS = { home_sos: Wrench, care_person: HeartHandshake, beauty_events: Sparkles, consulting_tech: Laptop };

const FREE_FAVORITES = 10;
const isNative = Capacitor.isNativePlatform();

// Link condivisi / QR del biglietto da visita: https://sospro24.com/?ad=<id> apre l'annuncio
const startParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const sharedAdId = startParams.get('ad');
// https://sospro24.com/?req=<id> apre una richiesta; ?view=requests apre la bacheca delle richieste
const sharedRequestId = startParams.get('req');
const startView = sharedRequestId || startParams.get('view') === 'requests' ? 'requests' : 'pros';

// https://sospro24.com/?inv=<codice>: link personale delle email d'invito ai professionisti.
// Segnala al pannello amministratore che l'invito è stato aperto, poi toglie il codice dall'indirizzo.
const inviteToken = startParams.get('inv');
if (inviteToken && /^[0-9a-f]{12,40}$/.test(inviteToken)) {
  supabase?.rpc('invite_open', { p_token: inviteToken }).then(() => {}, () => {});
  startParams.delete('inv');
  const rest = startParams.toString();
  window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
}

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
  const [blocked, setBlocked] = usePersistentState('sospro_blocked_v1', []);
  const [savedSearches, setSavedSearches] = usePersistentState('sospro_saved_searches_v1', []);
  const [dark, setDark] = usePersistentState('sospro_dark_v1', false);

  /* ------------------------------ Pubblicità, Premium, inviti (solo app nativa) ------------------------------ */
  const monetization = useMonetization();
  const premium = hasPremium(monetization);
  const [showPremium, setShowPremium] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [qrListingId, setQrListingId] = useState(null);

  useEffect(() => {
    initMonetization();
    if (isNative) initReferral();
  }, []);

  // Il tema scuro è Premium nell'app (sul sito è libero)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', Boolean(dark && premium));
  }, [dark, premium]);

  // Altezza del banner AdMob: serve a toast e pulsante SOS per non finirci sotto
  useEffect(() => {
    document.documentElement.style.setProperty('--ad-h', `${premium ? 0 : monetization.bannerHeight || 0}px`);
  }, [premium, monetization.bannerHeight]);

  // 7 tocchi sul logo nell'app = annunci di test sì/no (per le prove sul telefono)
  const [logoTaps, setLogoTaps] = useState({ n: 0, at: 0 });

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
  // Link di conferma/recupero in attesa del click della persona: { tokenHash, type }
  const [pendingLink, setPendingLink] = useState(null);
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });

    // Link delle email (modelli in supabase/email-templates): ?token_hash=...&type=email|recovery
    // La verifica la fa l'app, così il link punta al nostro sito e non a supabase.co.
    // Non si verifica da sola all'apertura: gli antivirus delle caselle aziendali aprono ed eseguono
    // le pagine dei link e consumerebbero il codice monouso. Si conferma solo col pulsante.
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const cleanUrl = () => window.history.replaceState(null, '', window.location.pathname);
    if (tokenHash && type) {
      cleanUrl();
      setPendingLink({ tokenHash, type });
    } else if (hashParams.get('error_code')) {
      // Vecchio formato del link (redirect di Supabase) scaduto o già usato
      cleanUrl();
      setLinkNotice('expired');
    } else if (hashParams.get('type') === 'signup') {
      setLinkNotice('confirmed');
    }
    return () => data.subscription.unsubscribe();
  }, []);

  const confirmPendingLink = async () => {
    if (!pendingLink || linkBusy) return;
    setLinkBusy(true);
    const { error } = await supabase.auth.verifyOtp({ token_hash: pendingLink.tokenHash, type: pendingLink.type });
    setLinkBusy(false);
    const wasRecovery = pendingLink.type === 'recovery';
    setPendingLink(null);
    if (error) setLinkNotice('expired');
    else if (wasRecovery) setRecovery(true);
    else setLinkNotice('confirmed');
  };

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

  /* ------------------------------ Richieste dei clienti ------------------------------ */
  const [dbRequests, setDbRequests] = useState([]);
  const [view, setView] = useState(startView);

  const reloadRequests = useCallback(async () => {
    if (!supabase) return;
    try {
      setDbRequests(await api.fetchRequests());
    } catch {
      /* la bacheca resta vuota: gli annunci funzionano comunque */
    }
  }, []);

  // Ricarica anche al cambio di account: le proprie richieste chiuse si vedono solo da loggati
  useEffect(() => { reloadRequests(); }, [reloadRequests, userId]);

  const [myVotes, setMyVotes] = useState(() => new Set());
  useEffect(() => {
    if (!userId) return setMyVotes(new Set());
    api.fetchMyVotes().then(setMyVotes).catch(() => setMyVotes(new Set()));
    return undefined;
  }, [userId]);

  // Le persone bloccate spariscono: i loro annunci e le loro recensioni non si vedono più
  const listings = useMemo(
    () => [...dbListings, ...(SHOW_DEMO ? INITIAL_LISTINGS : [])]
      .filter((l) => !blocked.includes(l.ownerId))
      .map((l) => normalizeListing({ ...l, reviews: (l.reviews || []).filter((r) => !blocked.includes(r.userId)) })),
    [dbListings, blocked]
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

  // Richieste aperte (non scadute, non di persone bloccate) con gli stessi filtri degli annunci
  const openRequests = useMemo(() => {
    const now = Date.now();
    return dbRequests.filter((r) => r.status === 'active' && new Date(r.expiresAt).getTime() > now && !blocked.includes(r.ownerId));
  }, [dbRequests, blocked]);

  const filteredRequests = useMemo(() => {
    const q = stripAccents(searchQuery.trim());
    return openRequests
      .filter((r) => {
        if (selectedCountry !== 'ALL' && r.country !== selectedCountry) return false;
        if (selectedCity !== 'ALL' && r.city !== selectedCity) return false;
        // Una richiesta per "tutta la città" vale per ogni zona
        if (selectedZone !== 'ALL' && r.zone && r.zone !== selectedZone) return false;
        if (selectedCategory !== 'ALL' && r.categoryId !== selectedCategory) return false;
        if (selectedSubcategory !== 'ALL' && r.subcategoryId !== selectedSubcategory) return false;
        if (onlySos && !r.urgent) return false;
        if (q) {
          const haystack = stripAccents(
            [r.body, r.city, r.zone, categoryName(r.categoryId, lang), subcategoryName(r.categoryId, r.subcategoryId, lang)].join(' ')
          );
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.urgent !== b.urgent ? (a.urgent ? -1 : 1) : new Date(b.createdAt) - new Date(a.createdAt)));
  }, [openRequests, selectedCountry, selectedCity, selectedZone, selectedCategory, selectedSubcategory, onlySos, searchQuery, lang]);

  /* ------------------------------ Finestre ------------------------------ */
  const [activeListingId, setActiveListingId] = useState(sharedAdId);
  const [activeRequestId, setActiveRequestId] = useState(sharedRequestId);
  const [showPublishRequest, setShowPublishRequest] = useState(false);
  useEffect(() => {
    if (sharedAdId || sharedRequestId || startParams.get('view')) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const activeRequest = useMemo(() => dbRequests.find((r) => r.id === activeRequestId) || null, [dbRequests, activeRequestId]);
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
  const toggleFavorite = (id) => {
    if (!favorites.includes(id) && !premium && favorites.length >= FREE_FAVORITES) {
      showToast(t.favLimitReached, 'error');
      setShowPremium(true);
      return;
    }
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Apertura di un annuncio dall'elenco: è un "punto di passaggio" per gli interstitial (mai sul contatto urgente)
  const openFromList = (id) => {
    trackAdAction();
    setActiveListingId(id);
  };

  const blockUser = (ownerId) => {
    if (!ownerId || !window.confirm(t.blockConfirm)) return;
    setBlocked((prev) => (prev.includes(ownerId) ? prev : [...prev, ownerId]));
    setActiveListingId(null);
    setActiveRequestId(null);
    showToast(t.userBlocked);
  };

  const deleteAccount = async () => {
    if (!window.confirm(t.deleteAccountConfirm)) return;
    try {
      await api.deleteAccount();
      setShowProfile(false);
      setSession(null);
      await reload();
      await reloadRequests();
      showToast(t.accountDeleted);
    } catch {
      showToast(t.actionError, 'error');
    }
  };

  const openQrCard = (id) => {
    if (!premium) return setShowPremium(true);
    setShowProfile(false);
    return setQrListingId(id);
  };

  const onLogoTap = () => {
    resetAllFilters();
    if (!isNative) return;
    const now = Date.now();
    const n = now - logoTaps.at < 1500 ? logoTaps.n + 1 : 1;
    if (n >= 7) {
      showToast(toggleTestAds() ? t.testAdsOn : t.testAdsOff);
      setLogoTaps({ n: 0, at: 0 });
    } else setLogoTaps({ n, at: now });
  };

  /* ------------------------------ Ricerche salvate (Premium) ------------------------------ */
  const currentSearch = {
    country: selectedCountry, city: selectedCity, zone: selectedZone, category: selectedCategory,
    subcategory: selectedSubcategory, q: searchQuery.trim(), sos: onlySos, verified: onlyVerified,
  };
  const searchKey = (x) => JSON.stringify([x.country, x.city, x.zone, x.category, x.subcategory, x.q.toLowerCase(), x.sos, x.verified]);
  const subcategoryLabel = (x) => {
    const catId = x.category !== 'ALL' ? x.category : CATEGORIES.find((c) => c.subcategories.some((sc) => sc.id === x.subcategory))?.id;
    return subcategoryName(catId, x.subcategory, lang);
  };
  const searchLabel = (x) => [
    x.q && `"${x.q}"`,
    x.subcategory !== 'ALL' ? subcategoryLabel(x) : x.category !== 'ALL' && categoryName(x.category, lang),
    x.city !== 'ALL' ? (x.zone !== 'ALL' ? `${x.city} · ${x.zone}` : x.city) : x.country !== 'ALL' && countryName(x.country, lang),
    x.sos && 'SOS',
  ].filter(Boolean).join(' · ') || t.allCategories;

  const saveSearch = () => {
    if (!premium) return setShowPremium(true);
    const key = searchKey(currentSearch);
    if (savedSearches.some((x) => searchKey(x) === key)) return showToast(t.searchAlreadySaved);
    setSavedSearches((prev) => [{ ...currentSearch, id: Date.now() }, ...prev].slice(0, 20));
    return showToast(t.searchSaved);
  };

  const applySearch = (x) => {
    setSearchQuery(x.q); setSelectedCountry(x.country); setSelectedCity(x.city); setSelectedZone(x.zone);
    setSelectedCategory(x.category); setSelectedSubcategory(x.subcategory); setOnlySos(x.sos); setOnlyVerified(x.verified);
    trackAdAction();
  };

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

  /* ------------------------------ Richieste: azioni ------------------------------ */
  const openPublishRequest = () => requireAuth(() => { setShowProfile(false); setShowPublishRequest(true); });

  const openRequest = (id) => {
    trackAdAction();
    setShowProfile(false);
    setActiveRequestId(id);
  };

  const publishRequest = async (form) => {
    try {
      const id = await api.createRequest(form);
      await reloadRequests();
      setShowPublishRequest(false);
      resetAllFilters();
      setSelectedCountry(form.country);
      setView('requests');
      setActiveRequestId(id);
      showToast(t.reqPublished);
      return true;
    } catch {
      return false;
    }
  };

  const closeRequest = async (id) => {
    try {
      await api.closeRequest(id);
      await reloadRequests();
      showToast(t.reqClosed);
    } catch {
      showToast(t.actionError, 'error');
    }
  };

  const deleteRequest = async (id) => {
    if (!window.confirm(t.reqDeleteConfirm)) return;
    try {
      await api.deleteRequest(id);
      if (activeRequestId === id) setActiveRequestId(null);
      await reloadRequests();
      showToast(t.reqDeleted);
    } catch {
      showToast(t.actionError, 'error');
    }
  };

  const reportRequest = async (requestId) => {
    try {
      await api.report({ requestId });
      showToast(t.reportSent);
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
      {/* Zona della notch nell'app: resta colorata anche quando si scorre */}
      <div className="fixed top-0 inset-x-0 z-[45] bg-red-700" style={{ height: 'env(safe-area-inset-top)' }} aria-hidden="true" />
      <div className="bg-red-700 shrink-0" style={{ height: 'env(safe-area-inset-top)' }} aria-hidden="true" />
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
      <header className="sticky z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm" style={{ top: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onLogoTap} className="flex items-center gap-3 group text-left" aria-label="SOSPro24 Global — home">
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
            {monetization.native && !monetization.isPro && (
              <button
                type="button"
                onClick={() => setShowPremium(true)}
                aria-label={t.premiumName}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition"
              >
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">{t.premiumBtn}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label={t.settingsBtn}
              title={t.settingsBtn}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
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
            {/* Due percorsi chiari: chi cerca e chi offre */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => { const el = document.getElementById('f-search'); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus({ preventScroll: true }); }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-left font-extrabold text-sm shadow-lg transition"
              >
                <Search className="w-5 h-5 shrink-0" />
                {t.heroSeekBtn}
              </button>
              <button
                type="button"
                onClick={openPublish}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-left transition"
              >
                <Briefcase className="w-5 h-5 shrink-0 text-blue-200" />
                <span className="min-w-0">
                  <span className="block font-extrabold text-sm">{t.heroProBtn}</span>
                  <span className="block text-[11px] text-slate-300 leading-snug">{t.heroProHint}</span>
                </span>
              </button>
            </div>
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
                <select id="f-city" value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); setSelectedZone('ALL'); trackAdAction(); }} className={selectCls}>
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
                <div className="text-[10px] opacity-80">{loadState === 'loading' ? '…' : listings.length} {listings.length === 1 ? t.adsCountOne : t.adsCount}</div>
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
                  onClick={() => { setSelectedCategory(isSelected ? 'ALL' : cat.id); setSelectedSubcategory('ALL'); trackAdAction(); }}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${isSelected ? 'bg-blue-600 text-white border-blue-400 shadow-lg' : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800'}`}
                >
                  <Icon className="w-5 h-5 shrink-0 text-blue-300" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-tight">{pick(cat.names, lang)}</div>
                    <div className="text-[10px] opacity-80">{loadState === 'loading' ? '…' : count} {count === 1 ? t.prosCountOne : t.prosCount}</div>
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

        {/* Professionisti | Richieste dei clienti */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-200/70 w-full sm:w-auto" role="tablist">
            {[
              ['pros', t.reqTabPros, filteredListings.length],
              ['requests', t.reqTabRequests, filteredRequests.length],
            ].map(([v, label, n]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => { setView(v); trackAdAction(); }}
                className={`px-4 py-2 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2 ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {label}
                <span className={`px-1.5 py-0.5 rounded-md text-[11px] ${view === v ? 'bg-blue-600 text-white' : 'bg-slate-300/70 text-slate-700'}`}>{loadState === 'loading' ? '…' : n}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={openPublishRequest}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm"
          >
            <Megaphone className="w-4 h-4" /> {t.reqPublishBtn}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-extrabold text-slate-900" aria-live="polite">
              {view === 'requests'
                ? `${filteredRequests.length} ${filteredRequests.length === 1 ? t.reqCountOne : t.reqCount}`
                : loadState === 'loading' ? t.loading : `${filteredListings.length} ${filteredListings.length === 1 ? t.resultsCountOne : t.resultsCount}`}
            </h2>
            {hasFilters && (
              <button type="button" onClick={resetAllFilters} className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline ml-2">{t.resetFilters}</button>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={saveSearch}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                {t.saveSearch}
                {!premium && <Crown className="w-3 h-3 text-amber-600" aria-label={t.premiumFeature} />}
              </button>
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

        {premium && savedSearches.length > 0 && (
          <div className="mb-5 -mt-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{t.savedSearches}</h3>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((x) => (
                <span key={x.id} className="inline-flex items-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 overflow-hidden">
                  <button type="button" onClick={() => applySearch(x)} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 hover:bg-slate-100">
                    <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                    {searchLabel(x)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavedSearches((prev) => prev.filter((y) => y.id !== x.id))}
                    aria-label={t.removeSavedSearch}
                    title={t.removeSavedSearch}
                    className="px-2 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {view === 'requests' && (
          <>
            <p className="mb-5 -mt-2 text-xs sm:text-sm font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5">🛠️ {t.reqForPros}</p>
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto my-6 shadow-sm">
                <Megaphone className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                <h3 className="font-extrabold text-slate-900 mb-1">{t.reqEmptyTitle}</h3>
                <p className="text-sm text-slate-600 mb-5">{t.reqEmptyText}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={openPublishRequest} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm">{t.reqPublishBtn}</button>
                  {hasFilters && <button type="button" onClick={resetAllFilters} className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm">{t.resetFilters}</button>}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRequests.map((r) => (
                  <RequestCard key={r.id} request={r} lang={lang} t={t} isMine={!!currentUser && r.ownerId === currentUser.id} onOpen={openRequest} />
                ))}
              </div>
            )}
          </>
        )}

        {view === 'pros' && loadState === 'error' && isSupabaseConfigured && (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-xl mx-auto my-6 shadow-sm">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="text-sm text-slate-700 mb-4">{t.loadError}</p>
            <button type="button" onClick={() => { setLoadState('loading'); reload(); }} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">{t.retry}</button>
          </div>
        )}

        {view === 'pros' && loadState === 'loading' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-2xl bg-slate-200/70 animate-pulse" />)}
          </div>
        )}

        {view === 'pros' && loadState === 'ok' && (filteredListings.length === 0 ? (
          <EmptyState
            t={t}
            lang={lang}
            country={selectedCountry}
            city={selectedCity}
            categoryId={selectedCategory}
            hasFilters={hasFilters}
            onReset={resetAllFilters}
            onPublish={openPublish}
            onPublishRequest={openPublishRequest}
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
                onOpen={openFromList}
                onContact={(id) => requireAuth(() => setActiveListingId(id))}
              />
            ))}
          </div>
        ))}

        {view === 'pros' && loadState === 'ok' && filteredListings.length > 0 && (
          <div className="mt-8">
            <RequestCta t={t} onPublish={openPublishRequest} compact />
          </div>
        )}

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

      <footer className="bg-slate-900 text-slate-400 py-8 px-4 border-t border-slate-800 mt-12 pb-24 md:pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Zap className="w-4 h-4 text-blue-400 shrink-0" />
            <span><span className="font-bold text-white">SOSPro24 Global</span> — {t.footerCopy}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={`https://sospro24.com/terms.html#${lang}`} target="_blank" rel="noopener" className="hover:text-white underline">{t.readTerms}</a>
            <a href={`https://sospro24.com/privacy.html#${lang}`} target="_blank" rel="noopener" className="hover:text-white underline">Privacy</a>
            <a href={`https://sospro24.com/support.html#${lang}`} target="_blank" rel="noopener" className="hover:text-white underline">{t.supportLink}</a>
            {!currentUser && <button type="button" onClick={() => setShowAuth(true)} className="hover:text-white underline">{t.loginRegisterBtn}</button>}
          </div>
        </div>
      </footer>
      <AdSpacer />

      {/* Pulsante SOS flottante su mobile (nel header è nascosto sotto i 768px) */}
      <button
        type="button"
        onClick={() => setShowSmartMatch(true)}
        className="md:hidden fixed bottom-[calc(1rem+var(--ad-h,0px)+env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-xl"
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
          onBlockUser={blockUser}
          onToast={showToast}
        />
      )}

      {activeRequest && (
        <RequestModal
          key={activeRequest.id}
          request={activeRequest}
          lang={lang}
          t={t}
          currentUser={currentUser}
          loadContact={api.fetchRequestContact}
          onClose={() => setActiveRequestId(null)}
          onLogin={() => setShowAuth(true)}
          onReport={reportRequest}
          onBlockUser={blockUser}
          onCloseRequest={closeRequest}
          onDelete={deleteRequest}
        />
      )}

      {/* ?shotreq (solo in sviluppo) apre il modulo senza account, per screenshot e prove grafiche */}
      {((showPublishRequest && currentUser) || (import.meta.env.DEV && startParams.has('shotreq'))) && (
        <PublishRequestModal
          lang={lang}
          t={t}
          user={currentUser || { name: '', country: 'IT' }}
          defaultCountry={selectedCountry}
          defaultCity={selectedCity}
          defaultCategory={selectedCategory}
          onClose={() => setShowPublishRequest(false)}
          onShowTerms={() => setShowTerms(true)}
          onPublish={publishRequest}
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
          onQrCard={openQrCard}
          onDeleteAccount={deleteAccount}
          myRequests={dbRequests.filter((r) => r.ownerId === currentUser.id)}
          onOpenRequest={openRequest}
          onPublishRequest={openPublishRequest}
        />
      )}

      {showTerms && <TermsModal lang={lang} t={t} onClose={() => setShowTerms(false)} />}

      {/* Conferma email / recupero password: si completa solo col click (gli antivirus non premono pulsanti) */}
      {pendingLink && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="link-confirm-title">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3"><ShieldCheck className="w-6 h-6" /></div>
            <h2 id="link-confirm-title" className="text-lg font-extrabold text-slate-900 mb-1">
              {pendingLink.type === 'recovery' ? t.linkRecoveryTitle : t.linkConfirmTitle}
            </h2>
            <p className="text-sm text-slate-600 mb-5">{pendingLink.type === 'recovery' ? t.linkRecoveryText : t.linkConfirmText}</p>
            <button type="button" onClick={confirmPendingLink} disabled={linkBusy} className="w-full px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold text-sm">
              {linkBusy ? t.loading : pendingLink.type === 'recovery' ? t.linkRecoveryBtn : t.linkConfirmBtn}
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          t={t}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          blockedCount={blocked.length}
          onUnblockAll={() => setBlocked([])}
          onOpenPremium={() => setShowPremium(true)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showPremium && <PremiumModal t={t} onClose={() => setShowPremium(false)} />}

      {qrListingId && listings.some((l) => l.id === qrListingId) && (
        <QrCardModal
          t={t}
          lang={lang}
          listing={listings.find((l) => l.id === qrListingId)}
          onClose={() => setQrListingId(null)}
          onToast={showToast}
        />
      )}

      <AdDiagnostics />

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
