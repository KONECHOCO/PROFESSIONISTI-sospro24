import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, MapPin, ShieldCheck, Zap, Star, Phone, MessageCircle, Heart,
  PlusCircle, User, Globe, Filter, CheckCircle2, AlertTriangle, Clock,
  Wrench, HeartHandshake, Sparkles, Laptop, ThumbsUp, Flag, X, LogOut,
  FileText, Award, ChevronRight, SlidersHorizontal, ArrowUpDown, Send
} from 'lucide-react';
import { LANGUAGES, COUNTRIES, CATEGORIES, FEEDBACK_TAGS, UI_TEXT, LEGAL_SECTIONS } from './data/i18n';
import { INITIAL_LISTINGS } from './data/mockListings';

const CATEGORY_ICONS = {
  home_sos: Wrench,
  care_person: HeartHandshake,
  beauty_events: Sparkles,
  consulting_tech: Laptop,
};

export default function App() {
  // Language state
  const [lang, setLang] = useState('it');
  const t = UI_TEXT[lang] || UI_TEXT.it;

  // Persistent listings in localStorage
  const [listings, setListings] = useState(() => {
    try {
      const saved = localStorage.getItem('sospro_listings_v1');
      return saved ? JSON.parse(saved) : INITIAL_LISTINGS;
    } catch {
      return INITIAL_LISTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sospro_listings_v1', JSON.stringify(listings));
    } catch {
      // ignore storage errors
    }
  }, [listings]);

  // Auth / User profile state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sospro_user_v1');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('sospro_user_v1', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('sospro_user_v1');
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  // Favorites state
  const [favorites, setFavorites] = useState(['pro-1', 'pro-3']);
  const [helpfulClicked, setHelpfulClicked] = useState({});

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState('ALL');
  const [onlySos, setOnlySos] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');

  // Modals state
  const [activeListingId, setActiveListingId] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authNextAction, setAuthNextAction] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSmartMatchModal, setShowSmartMatchModal] = useState(false);
  const [contactSuccessBanner, setContactSuccessBanner] = useState(null);

  // Auth form state
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    role: 'client', // 'client' | 'pro'
    country: 'IT',
    city: 'Milano',
    acceptedTerms: false,
  });

  // Review form state inside detail modal
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTags, setReviewTags] = useState([]);
  const [reviewComment, setReviewComment] = useState('');
  const [directMessageText, setDirectMessageText] = useState('');

  // Publish Ad form state
  const [newAd, setNewAd] = useState({
    name: '',
    country: 'IT',
    city: 'Milano',
    zone: 'Centro Storico',
    categoryId: 'home_sos',
    subcategoryId: 'plumber',
    title: '',
    description: '',
    hourlyRate: 35,
    callOutFee: 0,
    phone: '+39 345 ',
    languages: 'Italiano, English',
    skills: 'Pronto Intervento, Preventivo Chiaro',
    sosAvailable: true,
    acceptedTerms: false,
  });

  // Smart Match Wizard state
  const [smartMatchCountry, setSmartMatchCountry] = useState('IT');
  const [smartMatchCategory, setSmartMatchCategory] = useState('home_sos');

  // Derived Country / City / Zone options
  const currentCountryObj = useMemo(
    () => COUNTRIES.find((c) => c.code === selectedCountry) || COUNTRIES[0],
    [selectedCountry]
  );

  const availableCities = useMemo(() => {
    if (selectedCountry === 'ALL') {
      return COUNTRIES.flatMap((c) => c.cities);
    }
    return currentCountryObj.cities || [];
  }, [selectedCountry, currentCountryObj]);

  const availableZones = useMemo(() => {
    if (selectedCity === 'ALL') return [];
    const cityObj = availableCities.find((c) => c.id === selectedCity);
    return cityObj ? cityObj.zones : [];
  }, [selectedCity, availableCities]);

  // Derived Subcategories
  const availableSubcategories = useMemo(() => {
    if (selectedCategory === 'ALL') {
      return CATEGORIES.flatMap((cat) => cat.subcategories);
    }
    const cat = CATEGORIES.find((c) => c.id === selectedCategory);
    return cat ? cat.subcategories : [];
  }, [selectedCategory]);

  // Filtered and Sorted Listings
  const filteredListings = useMemo(() => {
    return listings
      .filter((item) => {
        if (selectedCountry !== 'ALL' && item.country !== selectedCountry) return false;
        if (selectedCity !== 'ALL' && item.city !== selectedCity) return false;
        if (selectedZone !== 'ALL' && item.zone !== selectedZone) return false;
        if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
        if (selectedSubcategory !== 'ALL' && item.subcategoryId !== selectedSubcategory) return false;
        if (onlySos && !item.sosAvailable) return false;
        if (onlyVerified && !item.verified) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const titleText = (item.titles[lang] || item.titles.it || '').toLowerCase();
          const descText = (item.descriptions[lang] || item.descriptions.it || '').toLowerCase();
          const skillsText = (item.skills || []).join(' ').toLowerCase();
          const match =
            item.name.toLowerCase().includes(q) ||
            item.city.toLowerCase().includes(q) ||
            item.zone.toLowerCase().includes(q) ||
            titleText.includes(q) ||
            descText.includes(q) ||
            skillsText.includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating || b.reviewsCount - a.reviewsCount;
        if (sortBy === 'price_asc') return a.hourlyRate - b.hourlyRate;
        if (sortBy === 'fastest') return a.responseTimeMin - b.responseTimeMin;
        // 'recommended': SOS available first, then rating
        if (a.sosAvailable !== b.sosAvailable) return a.sosAvailable ? -1 : 1;
        return b.rating - a.rating;
      });
  }, [
    listings,
    selectedCountry,
    selectedCity,
    selectedZone,
    selectedCategory,
    selectedSubcategory,
    onlySos,
    onlyVerified,
    searchQuery,
    sortBy,
    lang,
  ]);

  const activeListing = useMemo(
    () => listings.find((l) => l.id === activeListingId) || null,
    [listings, activeListingId]
  );

  // Helper to get localized category / subcategory / country names
  const getCountryName = (code) => {
    const c = COUNTRIES.find((x) => x.code === code);
    return c ? `${c.flag} ${c.names[lang] || c.names.it}` : code;
  };

  const getCategoryName = (catId) => {
    const c = CATEGORIES.find((x) => x.id === catId);
    return c ? c.names[lang] || c.names.it : catId;
  };

  const getSubcategoryName = (catId, subId) => {
    const c = CATEGORIES.find((x) => x.id === catId);
    const s = c?.subcategories.find((x) => x.id === subId);
    return s ? s.names[lang] || s.names.it : subId;
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCountry('ALL');
    setSelectedCity('ALL');
    setSelectedZone('ALL');
    setSelectedCategory('ALL');
    setSelectedSubcategory('ALL');
    setOnlySos(false);
    setOnlyVerified(false);
    setSortBy('recommended');
  };

  // Require Auth helper
  const requireAuth = (callback) => {
    if (currentUser) {
      callback();
    } else {
      setAuthNextAction(() => callback);
      setShowAuthModal(true);
    }
  };

  const handleQuickDemoLogin = (role) => {
    const userObj =
      role === 'pro'
        ? {
            id: 'user-demo-pro',
            name: 'Elena Ferri (Pro)',
            email: 'elena.ferri@sospro24.demo',
            role: 'pro',
            country: 'IT',
            city: 'Milano',
            acceptedTermsAt: new Date().toISOString(),
          }
        : {
            id: 'user-demo-client',
            name: 'Sara Bianchi',
            email: 'sara.bianchi@client.demo',
            role: 'client',
            country: 'IT',
            city: 'Milano',
            acceptedTermsAt: new Date().toISOString(),
          };
    setCurrentUser(userObj);
    setShowAuthModal(false);
    if (authNextAction) {
      authNextAction();
      setAuthNextAction(null);
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authForm.acceptedTerms || !authForm.name.trim()) return;
    const userObj = {
      id: 'user-' + Date.now(),
      name: authForm.name.trim(),
      email: authForm.email.trim() || 'utente@sospro24.org',
      role: authForm.role,
      country: authForm.country,
      city: authForm.city,
      acceptedTermsAt: new Date().toISOString(),
    };
    setCurrentUser(userObj);
    setShowAuthModal(false);
    if (authNextAction) {
      authNextAction();
      setAuthNextAction(null);
    }
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleReviewTag = (tag) => {
    setReviewTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (!reviewComment.trim() || !activeListing) return;

    const newReviewObj = {
      id: 'rev-' + Date.now(),
      author: currentUser.name,
      role: currentUser.role === 'pro' ? t.rolePro : t.roleClient,
      date: 'Adesso / Just now',
      rating: reviewRating,
      tags: reviewTags.length > 0 ? reviewTags : [(FEEDBACK_TAGS[lang] || FEEDBACK_TAGS.it)[0]],
      comment: reviewComment.trim(),
      helpful: 1,
    };

    setListings((prev) =>
      prev.map((item) => {
        if (item.id !== activeListing.id) return item;
        const updatedReviews = [newReviewObj, ...item.reviews];
        const totalStars = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
        const newAvg = Number((totalStars / updatedReviews.length).toFixed(1));
        return {
          ...item,
          reviews: updatedReviews,
          reviewsCount: item.reviewsCount + 1,
          rating: newAvg,
        };
      })
    );

    setReviewComment('');
    setReviewTags([]);
    setReviewRating(5);
  };

  const handleHelpfulClick = (listingId, reviewId) => {
    const key = `${listingId}_${reviewId}`;
    if (helpfulClicked[key]) return;
    setHelpfulClicked((prev) => ({ ...prev, [key]: true }));
    setListings((prev) =>
      prev.map((item) => {
        if (item.id !== listingId) return item;
        return {
          ...item,
          reviews: item.reviews.map((r) =>
            r.id === reviewId ? { ...r, helpful: (r.helpful || 0) + 1 } : r
          ),
        };
      })
    );
  };

  const handlePublishAdSubmit = (e) => {
    e.preventDefault();
    if (!newAd.acceptedTerms || !newAd.title.trim() || !newAd.description.trim()) return;

    const countryObj = COUNTRIES.find((c) => c.code === newAd.country) || COUNTRIES[1];
    const createdListing = {
      id: 'pro-' + Date.now(),
      name: newAd.name.trim() || currentUser?.name || 'Professionista Verificata',
      avatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      country: newAd.country,
      city: newAd.city,
      zone: newAd.zone,
      categoryId: newAd.categoryId,
      subcategoryId: newAd.subcategoryId,
      verified: true,
      sosAvailable: newAd.sosAvailable,
      responseTimeMin: newAd.sosAvailable ? 10 : 30,
      hourlyRate: Number(newAd.hourlyRate) || 35,
      callOutFee: Number(newAd.callOutFee) || 0,
      currency: countryObj.currency || '€',
      experienceYears: 5,
      languages: newAd.languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      phone: newAd.phone.trim() || '+39 340 000 0000',
      rating: 5.0,
      reviewsCount: 1,
      titles: {
        it: newAd.title,
        en: newAd.title,
        fr: newAd.title,
        es: newAd.title,
        de: newAd.title,
      },
      descriptions: {
        it: newAd.description,
        en: newAd.description,
        fr: newAd.description,
        es: newAd.description,
        de: newAd.description,
      },
      skills: newAd.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      reviews: [
        {
          id: 'rev-init-' + Date.now(),
          author: 'SOSPro24 Verification Team',
          role: 'Verifica Profilo',
          date: 'Oggi',
          rating: 5,
          tags: ['Identità Verificata', 'Condizioni Accettate'],
          comment: 'Profilo professionale registrato e verificato con successo sulla piattaforma.',
          helpful: 1,
        },
      ],
    };

    setListings((prev) => [createdListing, ...prev]);
    setShowPublishModal(false);
    setSelectedCountry(newAd.country);
    setSelectedCategory(newAd.categoryId);
    setActiveListingId(createdListing.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* TOP LEGAL DISCLAIMER & LANGUAGE BAR */}
      <div className="bg-slate-900 text-slate-200 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300">{t.intermediaryNoticeShort}</span>
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 ml-1"
            >
              {t.readTerms}
            </button>
          </div>

          {/* Multi-language selector */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Globe className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2 py-0.5 rounded font-medium transition ${
                  lang === l.code
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={l.label}
              >
                {l.flag} {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN NAVIGATION HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo */}
          <div
            onClick={resetAllFilters}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-slate-900 flex items-center justify-center text-white shadow-md relative">
              <Zap className="w-5 h-5 fill-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white sos-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition">
                  SOSPro<span className="text-blue-600">24</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Global
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">{t.brandSubtitle}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Instant SOS Smart Match Button */}
            <button
              onClick={() => setShowSmartMatchModal(true)}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs transition"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 sos-pulse" />
              {t.smartMatchBtn}
            </button>

            {/* Post an Ad Button */}
            <button
              onClick={() =>
                requireAuth(() => {
                  setNewAd((prev) => ({
                    ...prev,
                    name: currentUser?.name || prev.name,
                    country: selectedCountry !== 'ALL' ? selectedCountry : 'IT',
                  }));
                  setShowPublishModal(true);
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.publishAdBtn}</span>
            </button>

            {/* User Auth / Profile Button */}
            {currentUser ? (
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs sm:text-sm font-semibold transition"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="leading-none">{currentUser.name.split(' ')[0]}</div>
                  <div className="text-[10px] text-blue-600 font-medium">
                    {currentUser.role === 'pro' ? t.rolePro : t.roleClient}
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition"
              >
                <User className="w-4 h-4" />
                <span>{t.loginRegisterBtn}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION & MULTI-LEVEL GEOGRAPHIC + CATEGORY SEARCH */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white pt-8 pb-10 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-3xl mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
              {t.heroBadge}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3">
              {t.heroTitle}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {t.heroSubtitle}
            </p>
          </div>

          {/* SEARCH & LOCATION FILTER BOX */}
          <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-2xl border border-slate-200/80">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Keyword Search */}
              <div className="md:col-span-5 relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Servizio / Parola chiave
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Country Selector */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {t.countryLabel}
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setSelectedCity('ALL');
                    setSelectedZone('ALL');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.names[lang] || c.names.it}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Selector */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {t.cityLabel}
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setSelectedZone('ALL');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t.allCities}</option>
                  {availableCities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zone / District Selector */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {t.zoneLabel}
                </label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  disabled={selectedCity === 'ALL'}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="ALL">{t.allZones}</option>
                  {availableZones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Second Row inside Search Card: Quick Toggles & Subcategory */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* SOS 24/7 Toggle Button */}
                <button
                  type="button"
                  onClick={() => setOnlySos(!onlySos)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                    onlySos
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      onlySos ? 'bg-white' : 'bg-red-600 sos-pulse'
                    }`}
                  />
                  {t.sosFilterLabel}
                </button>

                {/* Verified Identity Toggle */}
                <button
                  type="button"
                  onClick={() => setOnlyVerified(!onlyVerified)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                    onlyVerified
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t.verifiedFilterLabel}
                </button>

                {/* Subcategory dropdown */}
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t.allSubcategories}</option>
                  {availableSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.names[lang] || sub.names.it}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 ml-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">{t.sortByLabel}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="recommended">{t.sortRecommended}</option>
                  <option value="rating">{t.sortRating}</option>
                  <option value="price_asc">{t.sortPriceAsc}</option>
                  <option value="fastest">{t.sortFastest}</option>
                </select>
              </div>
            </div>
          </div>

          {/* MACRO-CATEGORY PILLS */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedSubcategory('ALL');
              }}
              className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                  : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Filter className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">{t.allCategories}</div>
                <div className="text-[10px] opacity-75">{listings.length} annunci</div>
              </div>
            </button>

            {CATEGORIES.map((cat) => {
              const IconComp = CATEGORY_ICONS[cat.id] || Wrench;
              const isSelected = selectedCategory === cat.id;
              const count = listings.filter((l) => l.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(isSelected ? 'ALL' : cat.id);
                    setSelectedSubcategory('ALL');
                  }}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-400 shadow-lg'
                      : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <IconComp className="w-5 h-5 shrink-0 text-blue-400" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-tight truncate">
                      {cat.names[lang] || cat.names.it}
                    </div>
                    <div className="text-[10px] opacity-75">{count} professionisti</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT: DIRECTORY GRID */}
      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1">
        {/* Status / Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-extrabold text-slate-900">
              {filteredListings.length} {t.resultsCount}
            </h2>
            {(selectedCountry !== 'ALL' ||
              selectedCity !== 'ALL' ||
              selectedCategory !== 'ALL' ||
              selectedSubcategory !== 'ALL' ||
              onlySos ||
              searchQuery) && (
              <button
                onClick={resetAllFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline ml-2"
              >
                {t.resetFilters}
              </button>
            )}
          </div>

          {/* Country Quick Flags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setSelectedCountry(c.code);
                  setSelectedCity('ALL');
                  setSelectedZone('ALL');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition shrink-0 ${
                  selectedCountry === c.code
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {c.flag} {c.names[lang] || c.names.it}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-6 shadow-sm">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">{t.noResultsTitle}</h3>
            <p className="text-sm text-slate-500 mb-5">{t.noResultsDesc}</p>
            <button
              onClick={resetAllFilters}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
            >
              {t.resetFilters}
            </button>
          </div>
        ) : (
          /* LISTINGS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((pro) => {
              const isFav = favorites.includes(pro.id);
              return (
                <article
                  key={pro.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col overflow-hidden group"
                >
                  {/* Top Status Bar */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 truncate">
                      <span>{getCountryName(pro.country)}</span>
                      <span className="text-slate-300">•</span>
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">
                        {pro.city} ({pro.zone})
                      </span>
                    </div>

                    {pro.sosAvailable && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 sos-pulse" />
                        {t.availableNowBadge}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Profile Header */}
                    <div className="flex items-start gap-3.5 mb-3">
                      <img
                        src={pro.avatar}
                        alt={pro.name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-100 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-base text-slate-900 truncate">
                            {pro.name}
                          </h3>
                          {pro.verified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                              <ShieldCheck className="w-3 h-3" />
                              {t.verifiedBadge}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold text-blue-600 mt-0.5">
                          {getSubcategoryName(pro.categoryId, pro.subcategoryId)}
                        </div>

                        {/* Rating & Response Time */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {pro.rating.toFixed(1)}
                            <span className="text-slate-400 font-normal">
                              ({pro.reviewsCount} {t.reviewsLabel})
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {t.responseTimePrefix} ~{pro.responseTimeMin}m
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleFavorite(pro.id)}
                        className={`p-2 rounded-xl border transition ${
                          isFav
                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                        title={t.saveFavorite}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>

                    {/* Ad Title & Description */}
                    <h4 className="font-bold text-sm text-slate-800 leading-snug mb-2 line-clamp-2">
                      {pro.titles[lang] || pro.titles.it}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-3">
                      {pro.descriptions[lang] || pro.descriptions.it}
                    </p>

                    {/* Skills / Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
                      {(pro.skills || []).slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Transparent Pricing & Languages Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mb-4">
                      <div>
                        <span className="text-slate-400">{t.fromPrice} </span>
                        <span className="text-base font-extrabold text-slate-900">
                          {pro.currency}
                          {pro.hourlyRate}
                        </span>
                        <span className="text-slate-500">{t.perHour}</span>
                        <span className="block text-[11px] text-slate-500">
                          {t.callOutFee}{' '}
                          {pro.callOutFee === 0
                            ? t.freeQuote
                            : `${pro.currency}${pro.callOutFee}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">
                          {t.languagesLabel}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700">
                          {pro.languages.join(', ')}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setActiveListingId(pro.id)}
                        className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                        {t.viewProfileBtn} ({pro.reviews.length})
                      </button>

                      <button
                        onClick={() =>
                          requireAuth(() => {
                            setActiveListingId(pro.id);
                          })
                        }
                        className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {t.contactNowBtn}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* INTERMEDIARY PLATFORM LEGAL BANNER IN PAGE */}
        <section className="mt-12 bg-amber-50/90 border border-amber-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-amber-950 mb-1">
                {t.disclaimerBoxTitle}
              </h3>
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-4xl">
                {t.disclaimerBoxText}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTermsModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold shrink-0 transition"
          >
            {t.readTerms}
          </button>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-white">SOSPro24 Global</span>
            <span>— {t.footerCopy}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTermsModal(true)}
              className="hover:text-white underline"
            >
              {t.readTerms}
            </button>
            <button
              onClick={() => setShowAuthModal(true)}
              className="hover:text-white underline"
            >
              {t.loginRegisterBtn}
            </button>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          MODAL 1: PROFESSIONAL PROFILE, DIRECT CONTACT & FEEDBACK / COMMENTS
         ===================================================================== */}
      {activeListing && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
                <span>{getCountryName(activeListing.country)}</span>
                <span>•</span>
                <span>
                  {activeListing.city} — {activeListing.zone}
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveListingId(null);
                  setContactSuccessBanner(null);
                }}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Top Profile Info */}
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <img
                  src={activeListing.avatar}
                  alt={activeListing.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500/30 shadow-md"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-2xl font-extrabold text-slate-900">
                      {activeListing.name}
                    </h2>
                    {activeListing.verified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {t.verifiedBadge}
                      </span>
                    )}
                    {activeListing.sosAvailable && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-extrabold">
                        <span className="w-2 h-2 rounded-full bg-red-600 sos-pulse" />
                        {t.availableNowBadge}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-blue-600 mb-2">
                    {getCategoryName(activeListing.categoryId)} →{' '}
                    {getSubcategoryName(activeListing.categoryId, activeListing.subcategoryId)}
                  </p>

                  <h3 className="text-base font-bold text-slate-800 mb-2">
                    {activeListing.titles[lang] || activeListing.titles.it}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {activeListing.descriptions[lang] || activeListing.descriptions.it}
                  </p>

                  {/* Stats Badges */}
                  <div className="mt-4 flex flex-wrap gap-3 text-xs">
                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-900 flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      {activeListing.rating.toFixed(1)} ({activeListing.reviewsCount}{' '}
                      {t.reviewsLabel})
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 font-semibold text-slate-700">
                      {t.fromPrice}{' '}
                      <span className="font-extrabold text-slate-900">
                        {activeListing.currency}
                        {activeListing.hourlyRate}
                        {t.perHour}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 font-semibold text-slate-700">
                      {t.experienceLabel} {activeListing.experienceYears} {t.years}
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 font-semibold text-slate-700">
                      {t.languagesLabel} {activeListing.languages.join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* DIRECT CONTACT BOX (Gated by Registration) */}
              <div className="bg-slate-900 text-white rounded-2xl p-5">
                {currentUser ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-blue-400 font-bold">
                          Contatto Diretto Sbloccato (Zero Commissioni)
                        </div>
                        <div className="text-lg font-extrabold mt-0.5">
                          📞 {activeListing.phone}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            setContactSuccessBanner(
                              `Chiamata avviata verso ${activeListing.name} (${activeListing.phone}). Ricorda di concordare preventivo e condizioni direttamente con la professionista.`
                            )
                          }
                          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <Phone className="w-4 h-4" />
                          Chiama Ora
                        </button>
                        <button
                          onClick={() =>
                            setContactSuccessBanner(
                              `Richiesta WhatsApp inviata a ${activeListing.name} (${activeListing.phone}). Tempo medio di risposta: ~${activeListing.responseTimeMin} min.`
                            )
                          }
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp SOS
                        </button>
                      </div>
                    </div>

                    {/* Quick SOS Request Message Input */}
                    <div className="flex gap-2 pt-2 border-t border-slate-800">
                      <input
                        type="text"
                        value={directMessageText}
                        onChange={(e) => setDirectMessageText(e.target.value)}
                        placeholder={`Scrivi a ${activeListing.name} la tua urgenza o chiedi disponibilità...`}
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          if (!directMessageText.trim()) return;
                          setContactSuccessBanner(
                            `Messaggio inviato a ${activeListing.name}: "${directMessageText}"`
                          );
                          setDirectMessageText('');
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Invia
                      </button>
                    </div>

                    {contactSuccessBanner && (
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{contactSuccessBanner}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        {t.memberRequiredTitle}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        {t.memberRequiredDesc}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 transition"
                    >
                      {t.loginRegisterBtn}
                    </button>
                  </div>
                )}
              </div>

              {/* Intermediary Disclaimer Micro-Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{t.disclaimerBoxTitle}: </span>
                  {t.disclaimerBoxText}
                </div>
              </div>

              {/* FEEDBACK & COMMENTS SYSTEM */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  {t.leaveFeedbackTitle} ({activeListing.reviews.length})
                </h3>

                {/* Add Feedback Form */}
                <form
                  onSubmit={handleAddReview}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        {t.yourRating}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="p-1 hover:scale-110 transition"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= reviewRating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {!currentUser && (
                      <span className="text-[11px] text-amber-700 font-semibold">
                        * Richiede accesso/registrazione
                      </span>
                    )}
                  </div>

                  {/* Quick Feedback Tags */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-500 mb-1.5">
                      {t.selectTags}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(FEEDBACK_TAGS[lang] || FEEDBACK_TAGS.it).map((tag) => {
                        const active = reviewTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleReviewTag(tag)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            + {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={t.commentPlaceholder}
                    className="w-full p-3 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
                    >
                      {t.submitReviewBtn}
                    </button>
                  </div>
                </form>

                {/* Existing Reviews List */}
                <div className="space-y-3">
                  {activeListing.reviews.map((rev) => {
                    const key = `${activeListing.id}_${rev.id}`;
                    return (
                      <div
                        key={rev.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                              {rev.author.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-slate-900">
                                {rev.author}
                              </span>
                              <span className="ml-2 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                {rev.role}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <div className="flex items-center">
                              {Array.from({ length: rev.rating }).map((_, i) => (
                                <Star
                                  key={i}
                                  className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                                />
                              ))}
                            </div>
                            <span>• {rev.date}</span>
                          </div>
                        </div>

                        {rev.tags && rev.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {rev.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold"
                              >
                                ✓ {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">
                          {rev.comment}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <button
                            onClick={() => handleHelpfulClick(activeListing.id, rev.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition ${
                              helpfulClicked[key]
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            {t.helpfulBtn} ({rev.helpful || 0})
                          </button>

                          <button
                            onClick={() =>
                              setContactSuccessBanner(
                                'Grazie. La segnalazione è stata inviata al team di moderazione.'
                              )
                            }
                            className="inline-flex items-center gap-1 hover:text-rose-600"
                          >
                            <Flag className="w-3 h-3" />
                            {t.reportAdBtn}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: AUTHENTICATION & REGISTRATION (CLIENTE / PROFESSIONISTA)
         ===================================================================== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">
                {t.loginRegisterBtn}
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {t.memberRequiredDesc}
            </p>

            {/* Quick 1-click Demo Logins */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 mb-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-2">
                ⚡ Test Immediato (1-Click Demo)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('client')}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-200 text-xs font-bold transition shadow-sm"
                >
                  👤 {t.quickDemoClient}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('pro')}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                >
                  🛠️ {t.quickDemoPro}
                </button>
              </div>
            </div>

            {/* Full Registration Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAuthForm({ ...authForm, role: 'client' })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    authForm.role === 'client'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  👤 {t.roleClient}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthForm({ ...authForm, role: 'pro' })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    authForm.role === 'pro'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  🛠️ {t.rolePro}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome e Cognome *
                </label>
                <input
                  type="text"
                  required
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  placeholder="Es. Maria Rossi"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder="maria.rossi@email.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.countryLabel}
                  </label>
                  <select
                    value={authForm.country}
                    onChange={(e) => setAuthForm({ ...authForm, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    {COUNTRIES.filter((c) => c.code !== 'ALL').map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.names[lang] || c.names.it}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.cityLabel}
                  </label>
                  <input
                    type="text"
                    value={authForm.city}
                    onChange={(e) => setAuthForm({ ...authForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={authForm.acceptedTerms}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, acceptedTerms: e.target.checked })
                  }
                  className="mt-0.5"
                />
                <span>
                  {t.termsAcceptCheck}{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="underline font-bold"
                  >
                    ({t.readTerms})
                  </button>
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
              >
                Completa Registrazione & Accedi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: PUBLISH NEW AD (PER PROFESSIONISTE/I)
         ===================================================================== */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-extrabold text-slate-900">
                {t.publishModalTitle}
              </h3>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5">{t.publishModalSubtitle}</p>

            <form onSubmit={handlePublishAdSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Professionista / Attività *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAd.name}
                    onChange={(e) => setNewAd({ ...newAd, name: e.target.value })}
                    placeholder="Es. Laura Galli"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.phoneLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAd.phone}
                    onChange={(e) => setNewAd({ ...newAd, phone: e.target.value })}
                    placeholder="+39 340 1234567"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              {/* Location classification: Country -> City -> Zone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.countryLabel} *
                  </label>
                  <select
                    value={newAd.country}
                    onChange={(e) => {
                      const cObj = COUNTRIES.find((c) => c.code === e.target.value);
                      const firstCity = cObj?.cities[0]?.id || 'Centro';
                      const firstZone = cObj?.cities[0]?.zones[0] || 'Centro';
                      setNewAd({
                        ...newAd,
                        country: e.target.value,
                        city: firstCity,
                        zone: firstZone,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    {COUNTRIES.filter((c) => c.code !== 'ALL').map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.names[lang] || c.names.it}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.cityLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAd.city}
                    onChange={(e) => setNewAd({ ...newAd, city: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.zoneLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAd.zone}
                    onChange={(e) => setNewAd({ ...newAd, zone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria Principale *
                  </label>
                  <select
                    value={newAd.categoryId}
                    onChange={(e) => {
                      const cat = CATEGORIES.find((c) => c.id === e.target.value);
                      setNewAd({
                        ...newAd,
                        categoryId: e.target.value,
                        subcategoryId: cat?.subcategories[0]?.id || '',
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.names[lang] || cat.names.it}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Servizio Specifico *
                  </label>
                  <select
                    value={newAd.subcategoryId}
                    onChange={(e) => setNewAd({ ...newAd, subcategoryId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    {(
                      CATEGORIES.find((c) => c.id === newAd.categoryId)?.subcategories || []
                    ).map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.names[lang] || sub.names.it}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.adTitleLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={newAd.title}
                  onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                  placeholder="Es. Idraulico / Sarta / Infermiera a domicilio - Intervento Rapido"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.adBioLabel} *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newAd.description}
                  onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                  placeholder="Descrivi la tua esperienza, le zone coperte, gli orari e le garanzie offerte..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.hourlyRateLabel} (€/£/CHF)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={newAd.hourlyRate}
                    onChange={(e) => setNewAd({ ...newAd, hourlyRate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.callOutLabel}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newAd.callOutFee}
                    onChange={(e) => setNewAd({ ...newAd, callOutFee: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.languagesLabel}
                  </label>
                  <input
                    type="text"
                    value={newAd.languages}
                    onChange={(e) => setNewAd({ ...newAd, languages: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAd.sosAvailable}
                  onChange={(e) => setNewAd({ ...newAd, sosAvailable: e.target.checked })}
                />
                <span>🚨 {t.sosAvailableCheck}</span>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={newAd.acceptedTerms}
                  onChange={(e) =>
                    setNewAd({ ...newAd, acceptedTerms: e.target.checked })
                  }
                  className="mt-0.5"
                />
                <span>{t.termsAcceptCheck}</span>
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
              >
                {t.publishSubmitBtn}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: TERMS OF USE & INTERMEDIARY DISCLAIMER (CONDIZIONI DI UTILIZZO)
         ===================================================================== */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {t.termsTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {(LEGAL_SECTIONS[lang] || LEGAL_SECTIONS.it).map((sec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200"
                >
                  <h4 className="font-bold text-slate-900 mb-1.5">{sec.title}</h4>
                  <p>{sec.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm"
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: SMART MATCH SOS EMERGENCY ASSISTANT
         ===================================================================== */}
      {showSmartMatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-extrabold text-red-600 flex items-center gap-2">
                {t.smartMatchTitle}
              </h3>
              <button
                onClick={() => setShowSmartMatchModal(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-5">{t.smartMatchSubtitle}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.countryLabel}
                </label>
                <select
                  value={smartMatchCountry}
                  onChange={(e) => setSmartMatchCountry(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                >
                  {COUNTRIES.filter((c) => c.code !== 'ALL').map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.names[lang] || c.names.it}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo di Emergenza
                </label>
                <select
                  value={smartMatchCategory}
                  onChange={(e) => setSmartMatchCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.names[lang] || cat.names.it}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2.5 mb-5 max-h-64 overflow-y-auto">
              {listings
                .filter(
                  (l) =>
                    l.sosAvailable &&
                    (l.country === smartMatchCountry || l.categoryId === smartMatchCategory)
                )
                .slice(0, 4)
                .map((pro) => (
                  <div
                    key={pro.id}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-blue-400 flex items-center justify-between gap-3 bg-slate-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={pro.avatar}
                        alt={pro.name}
                        className="w-11 h-11 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {pro.name} ({pro.city})
                        </div>
                        <div className="text-xs text-red-600 font-semibold">
                          ⚡ {t.responseTimePrefix} ~{pro.responseTimeMin} min •{' '}
                          {pro.currency}
                          {pro.hourlyRate}
                          {t.perHour}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowSmartMatchModal(false);
                        setActiveListingId(pro.id);
                      }}
                      className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shrink-0"
                    >
                      {t.contactNowBtn}
                    </button>
                  </div>
                ))}
            </div>

            <button
              onClick={() => {
                setSelectedCountry(smartMatchCountry);
                setSelectedCategory(smartMatchCategory);
                setOnlySos(true);
                setShowSmartMatchModal(false);
              }}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm"
            >
              Mostra tutti i Professionisti SOS Disponibili Ora
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: USER / PROFESSIONAL PROFILE DASHBOARD
         ===================================================================== */}
      {showProfileModal && currentUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {currentUser.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentUser.email} • {currentUser.city} ({currentUser.country})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Switch Active Mode */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Modalità Profilo</div>
                  <div className="text-[11px] text-slate-500">
                    Passa da Cliente a Professionista in qualsiasi momento
                  </div>
                </div>
                <button
                  onClick={() =>
                    setCurrentUser({
                      ...currentUser,
                      role: currentUser.role === 'pro' ? 'client' : 'pro',
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  {currentUser.role === 'pro' ? `🛠️ ${t.rolePro}` : `👤 ${t.roleClient}`}
                </button>
              </div>

              {/* Saved Favorites */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Professioniste Salvate ({favorites.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {listings
                    .filter((l) => favorites.includes(l.id))
                    .map((fav) => (
                      <div
                        key={fav.id}
                        className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-800">
                          {fav.name} — {fav.city}
                        </span>
                        <button
                          onClick={() => {
                            setShowProfileModal(false);
                            setActiveListingId(fav.id);
                          }}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          Apri scheda
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setShowPublishModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  {t.publishAdBtn}
                </button>
                <button
                  onClick={() => {
                    setCurrentUser(null);
                    setShowProfileModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Esci dall’account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

