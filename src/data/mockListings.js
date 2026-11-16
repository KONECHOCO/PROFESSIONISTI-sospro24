// DATI DIMOSTRATIVI — tutti i professionisti, i numeri di telefono e le recensioni qui sotto
// sono FITTIZI e servono solo a mostrare il funzionamento dell'app.
// Valutazione e numero di recensioni NON sono salvati qui: vengono calcolati dalle recensioni.
export const INITIAL_LISTINGS = [
  {
    id: 'pro-1',
    demo: true,
    name: 'Elena Ferri',
    country: 'IT',
    city: 'Milano',
    zone: 'Isola / Garibaldi',
    categoryId: 'home_sos',
    subcategoryId: 'electrician',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 12,
    hourlyRate: 45,
    callOutFee: 20,
    currency: '€',
    experienceYears: 9,
    languages: ['Italiano', 'English', 'Français'],
    phone: '+39 000 000 0001',
    titles: {
      it: 'Elettricista Certificata DM 37/08 • Pronto Intervento Guasti & Salvavita 24/7',
      en: 'Certified Electrician • 24/7 Blackout & Circuit Breaker Emergency Repair',
      fr: 'Électricienne Certifiée • Dépannage Court-Circuit & Disjoncteur 24/7',
      es: 'Electricista Certificada • Urgencias Cortocircuitos y Cuadros 24/7',
      de: 'Zertifizierte Elektrikerin • 24/7 Notdienst bei Stromausfall & Sicherung'
    },
    descriptions: {
      it: 'Tecnica elettricista abilitata con oltre 9 anni di esperienza su impianti civili e domotici a Milano. Intervento rapido entro 30 minuti per blackout, corto circuito, sostituzione salvavita, prese bruciate e certificazione impianti.',
      en: 'Licensed residential & smart-home electrician in Milan. Rapid 30-minute dispatch for power outages, tripping breakers, wiring faults, and safety inspections.',
      fr: 'Électricienne qualifiée à Milan. Intervention en 30 min pour panne de courant, tableau électrique, domotique et mise aux normes.',
      es: 'Técnica electricista habilitada en Milán. Intervención en 30 minutos por apagones, diferencial, enchufes y domótica.',
      de: 'Zugelassene Elektrikerin in Mailand. Schnelle Hilfe in 30 Min. bei Stromausfall, FI-Schalter und Smart-Home-Anlagen.'
    },
    skills: ['Ricerca Guasti 24/7', 'Quadro Elettrico', 'Certificazione DM 37/08', 'Domotica & Smart Home'],
    reviews: [
      {
        id: 'r-101',
        author: 'Chiara M.',
        role: 'client',
        daysAgo: 2,
        rating: 5,
        tags: ['Intervento Rapido', 'Prezzo Onesto', 'Emergenza Risolta'],
        comment: 'Rimasta senza corrente alle 22:30 di domenica in zona Isola. Elena è arrivata in 20 minuti, ha sostituito il differenziale guasto e mi ha rilasciato regolare ricevuta al prezzo concordato al telefono!',
        helpful: 14
      },
      {
        id: 'r-102',
        author: 'Marco V.',
        role: 'client',
        daysAgo: 7,
        rating: 5,
        tags: ['Puntuale', 'Molto Professionale'],
        comment: 'Precisa, pulita nel lavoro e chiarissima nel preventivo prima di iniziare.',
        helpful: 6
      }
    ]
  },
  {
    id: 'pro-2',
    demo: true,
    name: 'Sofia Conti',
    country: 'IT',
    city: 'Roma',
    zone: 'Centro / Prati',
    categoryId: 'home_sos',
    subcategoryId: 'plumber',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 15,
    hourlyRate: 40,
    callOutFee: 15,
    currency: '€',
    experienceYears: 11,
    languages: ['Italiano', 'English', 'Español'],
    phone: '+39 000 000 0002',
    titles: {
      it: 'Idraulico Pronto Intervento Roma • Perdite Acqua, Allagamenti & Disotturazioni',
      en: 'Emergency Plumber in Rome • Water Leaks, Pipe Unblocking & Tap Repair',
      fr: 'Plombier Urgence Rome • Fuites d’Eau, Débouchage & Robinetterie',
      es: 'Fontanera Urgente Roma • Fugas de Agua, Desatascos y Grifería',
      de: 'Sanitär-Notdienst Rom • Wasserrohrbruch, Rohrreinigung & Armaturen'
    },
    descriptions: {
      it: 'Ditta termoidraulica familiare guidata da Sofia Conti. Specializzati in ricerca perdite occulte con termocamera, riparazione tubature, disotturazione lavandini/WC e sostituzione scaldabagni in tutta Roma Centro e Prati.',
      en: 'Thermal-camera leak detection, emergency pipe repair, drain unblocking, and water heater replacement across Central Rome.',
      fr: 'Détection de fuites par caméra thermique, débouchage express et réparation chauffe-eau à Rome Centre.',
      es: 'Detección de fugas con cámara térmica, desatascos urgentes y reparación de termos en Roma Centro.',
      de: 'Leckortung mit Wärmebildkamera, Rohrreinigung und Warmwasserbereiter-Reparatur in Rom Zentrum.'
    },
    skills: ['Perdite Acqua SOS', 'Disotturazione CanalJet', 'Termocamera', 'Scaldabagni & Rubinetteria'],
    reviews: [
      {
        id: 'r-201',
        author: 'Roberta G.',
        role: 'client',
        daysAgo: 4,
        rating: 5,
        tags: ['Emergenza Risolta', 'Super Consigliata'],
        comment: 'Flessibile del lavello scoppiato la mattina presto. Sofia ha risposto subito e risolto tutto senza rompere le piastrelle.',
        helpful: 9
      }
    ]
  },
  {
    id: 'pro-3',
    demo: true,
    name: 'Martina Moretti',
    country: 'IT',
    city: 'Torino',
    zone: 'Centro / Crocetta',
    categoryId: 'care_person',
    subcategoryId: 'nurse',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 10,
    hourlyRate: 35,
    callOutFee: 0,
    currency: '€',
    experienceYears: 8,
    languages: ['Italiano', 'Français', 'English'],
    phone: '+39 000 000 0003',
    titles: {
      it: 'Infermiera Professionale a Domicilio (Iscritta OPI) • Medicazioni, Prelievi & Terapie',
      en: 'Registered Home Nurse • Dressings, Injections, Blood Draws & Post-Op Care',
      fr: 'Infirmière Diplômée à Domicile • Pansements, Prises de Sang & Soins',
      es: 'Enfermera Titulada a Domicilio • Curas, Inyecciones y Asistencia Postoperatoria',
      de: 'Examinierte Pflegekraft zu Hause • Verbandswechsel, Injektionen & Nachsorge'
    },
    descriptions: {
      it: 'Infermiera laureata e iscritta all’Albo OPI. Offro assistenza infermieristica domiciliare anche urgente a Torino: cicli iniettivi, medicazioni complesse, gestione cateteri, flebo e assistenza post-dimissione ospedaliera.',
      en: 'Registered nurse providing urgent and scheduled home care in Turin: injections, wound care, IV therapy, and post-hospital recovery.',
      fr: 'Infirmière diplômée à Turin : injections, pansements complexes, perfusions et suivi post-hospitalisation à domicile.',
      es: 'Enfermera colegiada en Turín: inyecciones, curas complejas, sueros y cuidados postoperatorios a domicilio.',
      de: 'Registrierte Krankenschwester in Turin: Injektionen, Wundversorgung, Infusionen und häusliche Nachsorge.'
    },
    skills: ['Iscritta OPI', 'Terapie Iniettive', 'Medicazioni Post-Operatorie', 'Prelievi a Domicilio'],
    reviews: [
      {
        id: 'r-301',
        author: 'Famiglia Riva',
        role: 'client',
        daysAgo: 3,
        rating: 5,
        tags: ['Molto Professionale', 'Puntuale', 'Super Consigliata'],
        comment: 'Umanità, dolcezza e grande competenza con mia madre anziana appena dimessa dall’ospedale. Grazie di cuore Martina!',
        helpful: 19
      }
    ]
  },
  {
    id: 'pro-4',
    demo: true,
    name: 'Camille Laurent',
    country: 'FR',
    city: 'Paris',
    zone: 'Le Marais / Centre (1er-4e)',
    categoryId: 'home_sos',
    subcategoryId: 'locksmith',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 15,
    hourlyRate: 65,
    callOutFee: 25,
    currency: '€',
    experienceYears: 7,
    languages: ['Français', 'English', 'Italiano'],
    phone: '+33 000 000 0004',
    titles: {
      it: 'Fabbro Serraturista Parigi 24/7 • Apertura Porte Blindate Senza Scasso',
      en: '24/7 Emergency Locksmith Paris • Non-Destructive Door Opening & Lock Change',
      fr: 'Artisane Serrurière Paris 24/7 • Ouverture de Porte Sans Dégât & Cylindre A2P',
      es: 'Cerrajera 24/7 en París • Apertura de Puertas Sin Daños y Cambio de Bombín',
      de: 'Schlüsseldienst Paris 24/7 • Beschädigungsfreie Türöffnung & Schlosswechsel'
    },
    descriptions: {
      it: 'Artigiana serraturista certificata a Parigi Centro. Apertura porte bloccate o chiavi smarrite con tecnica non distruttiva. Prezzo fisso comunicato prima dell’intervento, zero sorprese.',
      en: 'Certified female locksmith in central Paris. Non-destructive door opening for slammed doors or lost keys. Fixed upfront quote before dispatch.',
      fr: 'Artisane serrurière de confiance au cœur de Paris. Ouverture de porte claquée sans destruction du cylindre. Tarif annoncé à l’avance par téléphone.',
      es: 'Cerrajera certificada en París Centro. Apertura de puertas sin romper la cerradura y presupuesto cerrado previo.',
      de: 'Zertifizierte Schlüsseldienst-Meisterin in Paris Zentrum. Türöffnung ohne Beschädigung zum transparenten Festpreis.'
    },
    skills: ['Ouverture Sans Dégât', 'Serrure Blindée A2P', 'Devis Transparent', 'Arrivée 20 min'],
    reviews: [
      {
        id: 'r-401',
        author: 'Sophie D.',
        role: 'client',
        daysAgo: 5,
        rating: 5,
        tags: ['Prezzo Onesto', 'Intervento Rapido'],
        comment: 'Enfin une serrurière honnête à Paris ! Porte claquée ouverte à la radio en 5 minutes au tarif exact annoncé.',
        helpful: 22
      }
    ]
  },
  {
    id: 'pro-5',
    demo: true,
    name: 'Valeria Rossi',
    country: 'IT',
    city: 'Milano',
    zone: 'Navigli / Porta Genova',
    categoryId: 'beauty_events',
    subcategoryId: 'tailor',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 20,
    hourlyRate: 30,
    callOutFee: 0,
    currency: '€',
    experienceYears: 14,
    languages: ['Italiano', 'English', 'Français'],
    phone: '+39 000 000 0005',
    titles: {
      it: 'Sarta Premiere & Riparazioni Sartoriali Express in Giornata (Eventi / Cerimonie)',
      en: 'Master Tailor & Same-Day Express Alterations (Bridal, Suits & Events)',
      fr: 'Couturière Première & Retouches Express le Jour Même (Cérémonies & Mode)',
      es: 'Modista de Alta Costura y Arreglos Express en el Día (Eventos y Novias)',
      de: 'Meisterschneiderin & Express-Änderungen am selben Tag (Abendmode & Anzüge)'
    },
    descriptions: {
      it: 'Ex sarta di atelier d’alta moda a Milano. Eseguo riparazioni sartoriali urgenti in giornata (orli, cerniere invisibili, messa a misura abiti da cerimonia e sposa) anche con ritiro e consegna a domicilio o in hotel.',
      en: 'Former haute-couture atelier tailor in Milan. Urgent same-day garment alterations, zippers, and evening/bridal dress fitting with hotel/home pickup.',
      fr: 'Ancienne couturière d’atelier haute couture à Milan. Retouches urgentes le jour même, robes de soirée et costumes avec service à domicile ou hôtel.',
      es: 'Modista de alta costura en Milán. Arreglos urgentes en el mismo día para vestidos de fiesta, trajes y novias a domicilio o en hotel.',
      de: 'Haute-Couture-Schneiderin in Mailand. Sofort-Änderungen am selben Tag für Abendkleider und Anzüge inkl. Hotel-/Hausbesuch.'
    },
    skills: ['Riparazioni in 2 Ore', 'Abiti Cerimonia & Sposa', 'Servizio a Domicilio / Hotel', 'Su Misura'],
    reviews: [
      {
        id: 'r-501',
        author: 'Beatrice L.',
        role: 'client',
        daysAgo: 7,
        rating: 5,
        tags: ['Emergenza Risolta', 'Molto Professionale'],
        comment: 'Mi si è rotta la zip dell’abito a 3 ore da un matrimonio sui Navigli. Valeria mi ha letteralmente salvato la serata in 40 minuti!',
        helpful: 11
      }
    ]
  },
  {
    id: 'pro-6',
    demo: true,
    name: 'Carmen Navarro',
    country: 'ES',
    city: 'Madrid',
    zone: 'Salamanca / Retiro',
    categoryId: 'care_person',
    subcategoryId: 'babysitter',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 10,
    hourlyRate: 18,
    callOutFee: 0,
    currency: '€',
    experienceYears: 6,
    languages: ['Español', 'English', 'Italiano'],
    phone: '+34 000 000 0006',
    titles: {
      it: 'Educatrice & Babysitter Bilingue (Primo Soccorso Pediatrico) • Anche SOS Serale',
      en: 'Bilingual Early Childhood Educator & SOS Babysitter (Pediatric First Aid)',
      fr: 'Éducatrice & Baby-sitter Bilingue (Secours Pédiatrique) • Garde Urgente',
      es: 'Educadora Infantil y Niñera Bilingüe (Primeros Auxilios) • Urgencias y Noches',
      de: 'Zweisprachige Erzieherin & SOS-Babysitterin (Erste Hilfe am Kind)'
    },
    descriptions: {
      it: 'Laureata in Educazione Infantile con brevetto di Primo Soccorso Pediatrico e referenze verificabili. Disponibile a Madrid per famiglie residenti o in viaggio (anche in hotel) con preavviso di 1 ora.',
      en: 'Early Childhood Education graduate with Pediatric First Aid certification and verified references in Madrid. Available for last-minute home or hotel childcare.',
      fr: 'Diplômée en éducation infantile avec brevet de secourisme pédiatrique à Madrid. Garde d’enfants à domicile ou à l’hôtel même en dernière minute.',
      es: 'Graduada en Educación Infantil con certificado de Primeros Auxilios Pediátricos y referencias comprobables en Madrid. Disponibilidad inmediata y fines de semana.',
      de: 'Ausgebildete Erzieherin mit Erste-Hilfe-Zertifikat für Kinder in Madrid. Auch kurzfristig zu Hause oder im Hotel verfügbar.'
    },
    skills: ['Primo Soccorso Pediatrico', 'Bilingue EN/ES', 'Referenze Verificate', 'Disponibile Serale/Weekend'],
    reviews: [
      {
        id: 'r-601',
        author: 'Laura & David',
        role: 'client',
        daysAgo: 3,
        rating: 5,
        tags: ['Puntuale', 'Super Consigliata'],
        comment: 'Carmen es maravillosa con los niños. Nos surgió una urgencia de trabajo y estuvo en casa en 35 minutos.',
        helpful: 8
      }
    ]
  },
  {
    id: 'pro-7',
    demo: true,
    name: 'Hannah Wright',
    country: 'UK',
    city: 'London',
    zone: 'Kensington & Chelsea',
    categoryId: 'consulting_tech',
    subcategoryId: 'it_repair',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 8,
    hourlyRate: 55,
    callOutFee: 0,
    currency: '£',
    experienceYears: 10,
    languages: ['English', 'Français'],
    phone: '+44 000 000 0007',
    titles: {
      it: 'Ingegnere Informatico SOS • Recupero Dati, Riparazione Mac/PC & Reti Wi-Fi',
      en: 'SOS IT Specialist & Mac/PC Engineer • Data Recovery, Wi-Fi & Cyber Security',
      fr: 'Ingénieure Informatique SOS • Récupération Données, Dépannage Mac/PC & Wi-Fi',
      es: 'Ingeniera Informática SOS • Recuperación de Datos, Reparación Mac/PC y Redes',
      de: 'SOS IT-Spezialistin • Datenrettung, Mac/PC-Soforthilfe & WLAN-Netzwerke'
    },
    descriptions: {
      it: 'Assistenza informatica immediata da remoto o a domicilio a Londra. Recupero file cancellati da SSD/MacBook, rimozione malware, configurazione reti aziendali e sblocco computer bloccati prima di scadenze importanti.',
      en: 'Immediate on-site or remote IT emergency support across London. SSD/MacBook data recovery, malware removal, business Wi-Fi diagnostics, and urgent laptop repair.',
      fr: 'Dépannage informatique immédiat à domicile ou à distance à Londres : récupération de données Mac/PC, sécurité et réseau Wi-Fi.',
      es: 'Soporte informático urgente presencial o remoto en Londres: recuperación de datos, Mac/PC y redes Wi-Fi.',
      de: 'Sofortige IT-Hilfe vor Ort in London oder per Fernwartung: Datenrettung, MacBook/PC-Reparatur und Netzwerksicherheit.'
    },
    skills: ['Recupero Dati Urgente', 'Apple Mac & Windows', 'Assistenza Remota Immediata', 'Sicurezza & Reti'],
    reviews: [
      {
        id: 'r-701',
        author: 'James T.',
        role: 'client',
        daysAgo: 1,
        rating: 5,
        tags: ['Emergenza Risolta', 'Intervento Rapido'],
        comment: 'Saved my entire presentation 2 hours before a client pitch in Kensington when my MacBook wouldn’t boot. Absolute lifesaver!',
        helpful: 17
      }
    ]
  },
  {
    id: 'pro-8',
    demo: true,
    name: 'Klara Hoffmann',
    country: 'DE',
    city: 'Berlin',
    zone: 'Mitte',
    categoryId: 'home_sos',
    subcategoryId: 'hvac',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 18,
    hourlyRate: 58,
    callOutFee: 20,
    currency: '€',
    experienceYears: 12,
    languages: ['Deutsch', 'English'],
    phone: '+49 000 000 0008',
    titles: {
      it: 'Tecnica Caldaie, Riscaldamento & Pompe di Calore • Pronto Intervento Blocco Caldaia',
      en: 'Master Heating & HVAC Technician • Emergency Boiler & Heat Pump Repair',
      fr: 'Technicienne Chauffagiste & Climatisation • Dépannage Chaudière en Panne',
      es: 'Técnica de Calderas y Climatización • Urgencias de Calefacción y Bombas de Calor',
      de: 'Meisterin für Heizung & Klimatechnik • 24/7 Notdienst bei Heizungsausfall'
    },
    descriptions: {
      it: 'Maestra artigiana termotecnica a Berlino. Riparazione urgente caldaie a condensazione, pompe di calore e impianti di climatizzazione (Vaillant, Viessmann, Bosch, Daikin).',
      en: 'Certified HVAC master technician in Berlin. Fast diagnostics and repair for gas boilers, heat pumps, and air conditioning systems.',
      fr: 'Maître chauffagiste à Berlin. Réparation urgente de chaudières, pompes à chaleur et climatisation.',
      es: 'Técnica especialista en calefacción y climatización en Berlín. Reparación urgente de calderas y bombas de calor.',
      de: 'Zertifizierte SHK-Meisterin in Berlin Mitte. Schnelle Fehlerdiagnose und Reparatur bei Heizungsausfall, Wärmepumpen und Klimaanlagen.'
    },
    skills: ['Blocco Caldaia SOS', 'Pompe di Calore', 'Ricambi Originali', 'Controllo Fumi'],
    reviews: [
      {
        id: 'r-801',
        author: 'ukas B.',
        role: 'client',
        daysAgo: 6,
        rating: 5,
        tags: ['Puntuale', 'Prezzo Onesto'],
        comment: 'Heizung fiel bei Minusgraden aus. Klara war innerhalb einer Stunde da und hatte das passende Ersatzteil direkt im Wagen.',
        helpful: 12
      }
    ]
  },
  {
    id: 'pro-9',
    demo: true,
    name: 'Giulia Bernasconi',
    country: 'CH',
    city: 'Lugano',
    zone: 'Centro / Lungolago',
    categoryId: 'consulting_tech',
    subcategoryId: 'translator',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 10,
    hourlyRate: 70,
    callOutFee: 0,
    currency: 'CHF',
    experienceYears: 9,
    languages: ['Italiano', 'Deutsch', 'Français', 'English'],
    phone: '+41 000 000 0009',
    titles: {
      it: 'Traduttrice Giurata & Interprete Simultanea (IT-DE-FR-EN) • Documenti Urgenti in 24h',
      en: 'Sworn Translator & Conference Interpreter (IT-DE-FR-EN) • Express 24h Docs',
      fr: 'Traductrice Assermentée & Interprète (IT-DE-FR-EN) • Urgences Notariales & Médicales',
      es: 'Traductora Jurada e Intérprete (IT-DE-FR-EN) • Documentos Urgentes en 24h',
      de: 'Beglaubigte Übersetzerin & Dolmetscherin (IT-DE-FR-EN) • 24h-Express-Service'
    },
    descriptions: {
      it: 'Traduttrice ufficiale e interprete a Lugano e Zurigo. Traduzioni asseverate urgenti in giornata per atti notarili, contratti, certificati medici e accompagnamento linguistico presso uffici, cliniche e tribunali.',
      en: 'Certified translator and interpreter in Lugano & Zurich. Same-day certified translations for legal deeds, contracts, medical records, and in-person interpreting.',
      fr: 'Traductrice officielle à Lugano : traductions assermentées express et interprétation médicale, juridique ou d’affaires.',
      es: 'Traductora oficial en Lugano: traducciones juradas urgentes e interpretación médica, legal o corporativa.',
      de: 'Beglaubigte Fachübersetzungen am selben Tag sowie Dolmetschen bei Notaren, Kliniken und Behörden in Lugano und Zürich.'
    },
    skills: ['Traduzioni Giurate 24h', '4 Lingue Madrelingua/C2', 'Interpretariato Medico/Legale', 'Asseverazione'],
    reviews: [
      {
        id: 'r-901',
        author: 'Studio Legale M.',
        role: 'client',
        daysAgo: 4,
        rating: 5,
        tags: ['Intervento Rapido', 'Molto Professionale'],
        comment: 'Traduzione complessa tedesco-italiano consegnata in meno di 6 ore per un rogito urgente a Lugano. Impeccabile.',
        helpful: 7
      }
    ]
  },
  {
    id: 'pro-10',
    demo: true,
    name: 'Alessia De Luca',
    country: 'IT',
    city: 'Napoli',
    zone: 'Vomero / Arenella',
    categoryId: 'beauty_events',
    subcategoryId: 'hair_makeup',
    verified: false,
    sosAvailable: false,
    responseTimeMin: 25,
    hourlyRate: 40,
    callOutFee: 10,
    currency: '€',
    experienceYears: 8,
    languages: ['Italiano', 'English'],
    phone: '+39 000 000 0010',
    titles: {
      it: 'Hairstylist & Make-Up Artist a Domicilio • Spose, Cerimonie & Shooting Fotografici',
      en: 'Mobile Hairstylist & Bridal Makeup Artist • Home & Hotel VIP Service',
      fr: 'Coiffeuse & Maquilleuse Pro à Domicile • Mariages, Soirées & Shooting',
      es: 'Peluquera y Maquilladora Profesional a Domicilio • Novias y Eventos',
      de: 'Mobile Hair & Make-up Artistin • Brautstyling, Events & Fotoshootings'
    },
    descriptions: {
      it: 'Make-up artist certificata Accademia e parrucchiera a domicilio a Napoli (Vomero, Chiaia, Posillipo). Trucco fotografico a lunga tenuta, acconciature sposa e preparazione last-minute per eventi e cerimonie.',
      en: 'Academy-trained makeup artist and hairstylist in Naples. Long-wear bridal and event styling directly at your home or hotel.',
      fr: 'Maquilleuse et coiffeuse professionnelle à domicile ou à l’hôtel à Naples pour mariages et événements.',
      es: 'Maquilladora y estilista a domicilio en Nápoles para bodas, graduaciones y eventos especiales.',
      de: 'Professionelles Braut- und Event-Styling direkt bei Ihnen zu Hause oder im Hotel in Neapel.'
    },
    skills: ['Trucco Sposa & Cerimonia', 'Hairstyling & Piega', 'Prodotti Ipoallergenici Pro', 'Servizio Hotel & Casa'],
    reviews: [
      {
        id: 'r-1001',
        author: 'Federica S.',
        role: 'client',
        daysAgo: 7,
        rating: 5,
        tags: ['Super Consigliata', 'Puntuale'],
        comment: 'Trucco e acconciatura durati intatti per 14 ore! Alessia è arrivata a casa alle 6:30 del mattino puntualissima.',
        helpful: 10
      }
    ]
  },
  {
    id: 'pro-11',
    demo: true,
    name: 'Nadia Benali',
    country: 'FR',
    city: 'Lyon',
    zone: 'Presqu’île',
    categoryId: 'care_person',
    subcategoryId: 'cleaning',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 15,
    hourlyRate: 24,
    callOutFee: 0,
    currency: '€',
    experienceYears: 7,
    languages: ['Français', 'English', 'العربية'],
    phone: '+33 000 000 0011',
    titles: {
      it: 'Pulizie Professionali, Sanificazione Post-Trasloco & Check-in Airbnb Express',
      en: 'Pro Deep Cleaning, End-of-Tenancy & Urgent Airbnb Turnover Service',
      fr: 'Nettoyage Pro, Ménage Fin de Bail & Urgence Conciergerie Airbnb 7j/7',
      es: 'Limpieza Profesional, Fin de Alquiler y Urgencias Airbnb 7 días',
      de: 'Prof. Grundreinigung, Umzugsreinigung & Express-Airbnb-Service'
    },
    descriptions: {
      it: 'Specialista in pulizie di fondo, igienizzazione a vapore ecologica, pulizie post-ristrutturazione e preparazione rapida appartamenti Airbnb/B&B a Lione.',
      en: 'Eco-steam deep cleaning, post-renovation cleanup, and urgent same-day Airbnb turnover service across Lyon.',
      fr: 'Spécialiste du nettoyage écologique à la vapeur, remise en état après travaux ou déménagement et ménage express entre deux locations Airbnb à Lyon.',
      es: 'Especialista en limpieza profunda con vapor ecológico, fin de obra y cambios urgentes de Airbnb en Lyon.',
      de: 'Öko-Dampfreinigung, Endreinigung bei Umzug und kurzfristiger Airbnb-Reinigungsservice in Lyon.'
    },
    skills: ['Vapore Ecologico 160°C', 'Urgenze Check-in Airbnb', 'Pulizie Post-Cantiere', 'Attrezzatura Inclusa'],
    reviews: [
      {
        id: 'r-1101',
        author: 'Marc L.',
        role: 'client',
        daysAgo: 5,
        rating: 5,
        tags: ['Intervento Rapido', 'Molto Professionale'],
        comment: 'Appartement impeccable en 3 heures avant un état des lieux de sortie. Je recommande à 100%.',
        helpful: 5
      }
    ]
  },
  {
    id: 'pro-12',
    demo: true,
    name: 'Chiara Pellegrini',
    country: 'IT',
    city: 'Bologna',
    zone: 'Centro Storico',
    categoryId: 'home_sos',
    subcategoryId: 'handyman',
    verified: false,
    sosAvailable: true,
    responseTimeMin: 20,
    hourlyRate: 32,
    callOutFee: 10,
    currency: '€',
    experienceYears: 6,
    languages: ['Italiano', 'English'],
    phone: '+39 000 000 0012',
    titles: {
      it: 'Artigiana Tuttofare & Restauratrice • Riparazioni Casa, Tapparelle & Montaggio Mobili',
      en: 'Skilled Handyman & Wood Restorer • Blinds, Doors, Shelving & Furniture Assembly',
      fr: 'Artisane Multiservices • Réparations Maison, Volets & Montage de Meubles',
      es: 'Manitas Profesional • Reparaciones del Hogar, Persianas y Montaje de Muebles',
      de: 'Handwerkerin & Montageservice • Reparaturen, Rollläden & Möbelmontage'
    },
    descriptions: {
      it: 'Artigiana precisa e attrezzata per piccole e medie riparazioni domestiche a Bologna: sblocco tapparelle, sostituzione cerniere, montaggio cucine e armadi IKEA, stuccatura pareti e fissaggio TV a muro.',
      en: 'Fully equipped craftswoman in Bologna for home repairs: roller shutters, door hinges, IKEA furniture assembly, wall mounting, and carpentry.',
      fr: 'Artisane équipée à Bologne pour toutes réparations domestiques : volets roulants, montage de meubles IKEA et fixations murales.',
      es: 'Artesana equipada en Bolonia para reparaciones del hogar: persianas, montaje de muebles IKEA y carpintería.',
      de: 'Bestens ausgerüstete Handwerkerin in Bologna für Rollladenreparatur, IKEA-Möbelmontage und Wandbefestigungen.'
    },
    skills: ['Riparazione Tapparelle', 'Montaggio Mobili', 'Falegnameria & Porte', 'Zero Sporco in Casa'],
    reviews: [
      {
        id: 'r-1201',
        author: 'Sara T.',
        role: 'client',
        daysAgo: 7,
        rating: 5,
        tags: ['Prezzo Onesto', 'Super Consigliata'],
        comment: 'Fantastica! Ha riparato due tapparelle bloccate e montato una libreria in un pomeriggio lasciando tutto pulitissimo.',
        helpful: 13
      }
    ]
  }
];

