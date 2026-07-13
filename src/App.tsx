import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from './firebaseConfig';
import { collection, query, limit, getDocs, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  Search, MapPin, Star, ShieldCheck, Zap, Award, 
  Menu, X, Home, FileText, MessageSquare, User, 
  LogOut, Phone, Sparkles, Check, Info, Bell, InfoIcon 
} from 'lucide-react';

// Subcomponents
import Auth from './components/Auth';
import Terms from './components/Terms';
import RequestQuote from './components/RequestQuote';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';

// South African Location and Specialty Configuration
const LOCATION_MAPPING: Record<string, string[]> = {
  "Western Cape": ["Cape Town CBD", "Northern Suburbs", "Southern Suburbs", "Atlantic Seaboard", "Western Seaboard", "South Peninsula", "Cape Helderberg", "Cape Winelands", "Paarl/Wellington", "Stellenbosch", "Garden Route", "George/Knysna", "West Coast", "Overberg", "Central Karoo"],
  "Gauteng": ["Johannesburg CBD", "Sandton/Rivonia", "Randburg", "Roodepoort", "Soweto", "Midrand", "Pretoria/Tshwane CBD", "Centurion", "Pretoria East", "Pretoria North", "Ekurhuleni (East Rand)", "Kempton Park", "Brakpan/Benoni", "Sedibeng", "West Rand"],
  "Kwa Zulu Natal": ["Durban Central", "Umhlanga/Ballito", "Durban North", "Durban South", "Pinetown/Westville", "Amanzimtoti", "Pietermaritzburg", "uMgungundlovu", "King Cetshwayo/Richards Bay", "iLembe", "Ugu (South Coast)", "Newcastle"],
  "Eastern Cape": ["Gqeberha (Port Elizabeth)", "East London (Buffalo City)", "Mthatha", "Sarah Baartman", "Amatole", "Chris Hani", "Joe Gqabi"],
  "Free State": ["Bloemfontein (Mangaung)", "Welkom", "Sasolburg", "Bethlehem", "Fezile Dabi", "Lejweleputswa", "Thabo Mofutsanyane"],
  "Limpopo": ["Polokwane (Capricorn)", "Thohoyandou (Vhembe)", "Tzaneen (Mopani)", "Sekhukhune", "Waterberg", "Bela-Bela"],
  "Mpumalanga": ["Nelspruit (Ehlanzeni)", "Witbank (Nkangala)", "Secunda (Gert Sibande)", "Middelburg", "White River"],
  "North West": ["Rustenburg (Bojanala)", "Mahikeng", "Potchefstroom (Dr Kenneth Kaunda)", "Klerksdorp", "Brits"],
  "Northern Cape": ["Kimberley (Frances Baard)", "Upington", "John Taolo Gaetsewe", "Namakwa", "Pixley ka Seme"]
};

const SUBURB_TO_REGION_MAP: Record<string, string> = {
  "brackenfell": "Northern Suburbs", "bellville": "Northern Suburbs", "durbanville": "Northern Suburbs",
  "parow": "Northern Suburbs", "goodwood": "Northern Suburbs", "kraaifontein": "Northern Suburbs",
  "kuils river": "Northern Suburbs", "century city": "Northern Suburbs", "edgemead": "Northern Suburbs",
  "milnerton": "Western Seaboard", "table view": "Western Seaboard", "blouberg": "Western Seaboard",
  "parklands": "Western Seaboard", "sunningdale": "Western Seaboard", "west beach": "Western Seaboard",
  "claremont": "Southern Suburbs", "rondebosch": "Southern Suburbs", "newlands": "Southern Suburbs",
  "wynberg": "Southern Suburbs", "kenilworth": "Southern Suburbs", "observatory": "Southern Suburbs",
  "sea point": "Atlantic Seaboard", "camps bay": "Atlantic Seaboard", "clifton": "Atlantic Seaboard",
  "somerset west": "Cape Helderberg", "strand": "Cape Helderberg", "gordon's bay": "Cape Helderberg",
  "sandton": "Sandton/Rivonia", "rivonia": "Sandton/Rivonia", "bryanston": "Sandton/Rivonia",
  "fourways": "Sandton/Rivonia", "lonehill": "Sandton/Rivonia", "sunninghill": "Sandton/Rivonia",
  "randburg": "Randburg", "ferndale": "Randburg", "northcliff": "Randburg", "cresta": "Randburg",
  "midrand": "Midrand", "halfway house": "Midrand", "kyalami": "Midrand", "centurion": "Centurion",
  "soweto": "Soweto", "diepkloof": "Soweto", "orlando": "Soweto", "braamfontein": "Johannesburg CBD",
  "umhlanga": "Umhlanga/Ballito", "ballito": "Umhlanga/Ballito", "durban north": "Durban North",
  "westville": "Pinetown/Westville", "pinetown": "Pinetown/Westville", "hillcrest": "Pinetown/Westville",
  "stellenbosch": "Stellenbosch", "paarl": "Paarl/Wellington", "wellington": "Paarl/Wellington"
};

const POSTAL_CODE_TO_REGION_MAP: Record<string, string> = {
  "7570": "Northern Suburbs", "7560": "Northern Suburbs", "7550": "Northern Suburbs", "7500": "Northern Suburbs",
  "7460": "Northern Suburbs", "7580": "Northern Suburbs", "7441": "Western Seaboard", "7446": "Western Seaboard",
  "7530": "Northern Suburbs", "8001": "Cape Town CBD", "7700": "Southern Suburbs", "7708": "Southern Suburbs",
  "7130": "Cape Helderberg", "7140": "Cape Helderberg", "7600": "Stellenbosch", "2000": "Johannesburg CBD",
  "2196": "Sandton/Rivonia", "2128": "Sandton/Rivonia", "2191": "Sandton/Rivonia", "2194": "Randburg",
  "1685": "Midrand", "0157": "Centurion", "4001": "Durban Central", "4319": "Umhlanga/Ballito"
};

const CATEGORIES = [
  { name: "Plumber", label: "Plumbing", desc: "Leaking pipes, blockages & geysers", icon: "💧" },
  { name: "Electrician", label: "Electrical", desc: "Tripping lines, solar & compliance certificates", icon: "⚡" },
  { name: "Builder", label: "Construction", desc: "Renovations, brickwork & plastering", icon: "🔨" },
  { name: "Gas", label: "Gas Fitting", desc: "Hobs, leak tests & gas installations", icon: "🔥" },
  { name: "Solar/Power", label: "Solar & EV", desc: "Backups, green-cards & hybrid solar", icon: "☀️" },
  { name: "Cleaning", label: "Cleaning Pros", desc: "Deep cleans, offices & upholstery", icon: "✨" },
  { name: "Handyman", label: "Handyman", desc: "Repairs, assembly & hanging items", icon: "🛠️" },
  { name: "Pest Control", label: "Pest Control", desc: "Fumigation, bugs & infestations", icon: "🐜" }
];

// Fallback South African Professional Listings if Database is Empty
const FALLBACK_PROFESSIONALS = [
  {
    id: "pro_cape_plumbing",
    name: "Cape Peninsula Plumbing Masters",
    category: "Plumber",
    tier: "provincial",
    province: "Western Cape",
    region: "Northern Suburbs",
    rating: 4.9,
    reviewsCount: 34,
    logo: "",
    rapidResponder: true,
    cipcVerified: true,
    description: "SANS compliant elite plumbing. Emergency leak repairs, PIRB certified geyser replacements, and advanced drain cleaning across the Peninsula.",
    website: "https://capepeninsulaplumbing.co.za",
    pirbNumber: "PIRB-89302-WC"
  },
  {
    id: "pro_gauteng_solar",
    name: "Jozi Power & Hybrid Solar",
    category: "Solar/Power",
    tier: "multi-province",
    province: "Gauteng",
    region: "Sandton/Rivonia",
    rating: 5.0,
    reviewsCount: 52,
    logo: "",
    rapidResponder: true,
    cipcVerified: true,
    description: "Premium commercial and home solar backups. Registered PV GreenCard installers offering bespoke inverter setups, lithium battery banks and EV chargers.",
    website: "https://jozipower.co.za",
    pvGreenCardNumber: "PVGC-77402-GP"
  },
  {
    id: "pro_kzn_electrical",
    name: "Durban Sparks Electrical Services",
    category: "Electrician",
    tier: "one region",
    province: "Kwa Zulu Natal",
    region: "Durban Central",
    rating: 4.8,
    reviewsCount: 21,
    logo: "",
    rapidResponder: false,
    cipcVerified: true,
    description: "Registered wireman installers. Electrical fault findings, full residential re-wiring, and immediate issue of Certificates of Compliance (CoC).",
    wiremanNumber: "ECA-449302-KZN"
  }
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'client' | 'vendor' | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  // Layout / Pages
  const [currentPage, setCurrentPage] = useState<'home' | 'results' | 'dashboard' | 'chat' | 'profile'>('home');
  const [selectedCategory, setSelectedCategory] = useState("Plumber");
  const [activeChatId, setActiveChatId] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search/Geo coordinates & Address fields
  const [searchQuery, setSearchQuery] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationProvince, setLocationProvince] = useState("");
  const [locationRawSuburb, setLocationRawSuburb] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  // Live Pros/Leads Listings
  const [featuredVendors, setFeaturedVendors] = useState<any[]>([]);
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [selectedVendorDetail, setSelectedVendorDetail] = useState<any>(null);
  const [pulseLeads, setPulseLeads] = useState<any[]>([]);

  // Trigger quote submission wizard
  const [quoteRequestMode, setQuoteRequestMode] = useState(false);
  const [directQuoteVendorId, setDirectQuoteVendorId] = useState<string | null>(null);

  // Fetch auth & database status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Listen to client account meta
        const userDocRef = doc(db, "users", currentUser.uid);
        const unsubUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserRole(data.role || 'client');
            setHasAcceptedTerms(data.hasAcceptedTerms !== false);
            
            if (data.role === 'vendor') {
              alert("Access Denied: Vendor accounts cannot log into the Client app. Please register a new client account.");
              signOut(auth);
            }
          } else {
            // Default safe assumption if user is not saved in Firestore
            setUserRole('client');
            setHasAcceptedTerms(true);
          }
          setLoading(false);
        }, (err) => {
          console.error("User collection snapshot error:", err);
          setLoading(false);
        });

        return () => unsubUser();
      } else {
        setUser(null);
        setUserRole(null);
        setHasAcceptedTerms(true);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Fetch professionals matching categories
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "professionals"));
        const vendorsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const validVendors = vendorsList.length > 0 ? vendorsList : FALLBACK_PROFESSIONALS;
        setAllVendors(validVendors);

        // Filter premium paid tier featured vendors
        const featured = validVendors.filter((v: any) => {
          const tier = String(v.tier || "").toLowerCase().trim();
          const targetTiers = ["multi-province", "provincial", "three regions", "one region"];
          return targetTiers.includes(tier) && v.isApproved !== false;
        });
        
        setFeaturedVendors(featured.length > 0 ? featured : FALLBACK_PROFESSIONALS);
      } catch (err) {
        console.warn("Could not query professionals Firestore collection, defaulting to local fallbacks:", err);
        setAllVendors(FALLBACK_PROFESSIONALS);
        setFeaturedVendors(FALLBACK_PROFESSIONALS);
      }
    };
    fetchVendors();
  }, []);

  // Pulse Activity Ticker (Real-time leads listener)
  useEffect(() => {
    const qLeads = query(collection(db, "leads"), orderBy("createdAt", "desc"), limit(6));
    const unsubscribe = onSnapshot(qLeads, (snapshot) => {
      const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPulseLeads(leads);
    }, (err) => {
      console.warn("Could not listen to leads collection (offline/unauth):", err);
    });
    return unsubscribe;
  }, []);

  // Geolocation detection logic
  const handleDetectLocation = async () => {
    setGeoLoading(true);
    try {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        setGeoLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=18`,
            { headers: { 'User-Agent': 'Slyzah-Web/1.0' } }
          );
          const data = await response.json();
          const address = data.address || {};
          const detectedProvince = address.state || "";
          const detectedPostalCode = address.postcode;

          const potentialSuburbs = [
            address.suburb,
            address.neighbourhood,
            address.residential,
            address.village,
            address.town,
            address.city_district,
            address.city
          ].filter(Boolean) as string[];

          let finalRegion = "";
          let finalProvince = detectedProvince;

          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
          const pKey = Object.keys(LOCATION_MAPPING).find(k => normalize(k) === normalize(detectedProvince));

          if (pKey) {
            finalProvince = pKey;
            const regions = LOCATION_MAPPING[pKey];

            // 1. Postal Code Lookup
            if (detectedPostalCode && POSTAL_CODE_TO_REGION_MAP[detectedPostalCode]) {
              const mappedRegion = POSTAL_CODE_TO_REGION_MAP[detectedPostalCode];
              if (regions.includes(mappedRegion)) {
                finalRegion = mappedRegion;
              }
            }

            // 2. Suburb Map Lookup
            if (!finalRegion) {
              for (const sub of potentialSuburbs) {
                const cleanSub = sub.toLowerCase().trim();
                if (SUBURB_TO_REGION_MAP[cleanSub]) {
                  const mappedRegion = SUBURB_TO_REGION_MAP[cleanSub];
                  if (regions.includes(mappedRegion)) {
                    finalRegion = mappedRegion;
                    break;
                  }
                }
              }
            }

            // 3. Fallback: Check if suburb is matching region
            if (!finalRegion) {
              for (const sub of potentialSuburbs) {
                const match = regions.find(r => {
                  const parts = r.split('/').map(p => p.trim().toLowerCase());
                  return parts.some(part => sub.toLowerCase().includes(part));
                });
                if (match) {
                  finalRegion = match;
                  break;
                }
              }
            }
          }

          setLocationCity(finalRegion || potentialSuburbs[0] || "Cape Town CBD");
          setLocationProvince(finalProvince || "Western Cape");
          setLocationRawSuburb(potentialSuburbs[0] || "");
        } catch (err) {
          console.error(err);
          // Set standard defaults
          setLocationCity("Northern Suburbs");
          setLocationProvince("Western Cape");
        } finally {
          setGeoLoading(false);
        }
      }, (geoErr) => {
        console.warn("Geo error:", geoErr);
        // Prompt manually
        setLocationCity("Northern Suburbs");
        setLocationProvince("Western Cape");
        setGeoLoading(false);
      });

    } catch (err) {
      console.error(err);
      setGeoLoading(false);
    }
  };

  // Pulse lead rotation state
  const [pulseIndex, setPulseIndex] = useState(0);
  useEffect(() => {
    if (pulseLeads.length === 0) return;
    const interval = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % pulseLeads.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [pulseLeads]);

  // Featured pros filtering based on detected location & tier allowances
  const filteredFeaturedVendors = useMemo(() => {
    if (!locationProvince && !locationCity) {
      return featuredVendors.slice(0, 4);
    }
    const userProv = locationProvince.toLowerCase().trim();
    const userCity = locationCity.toLowerCase().trim();

    return featuredVendors.filter((vendor: any) => {
      const tier = String(vendor.tier || "").toLowerCase().trim();
      if (tier === 'multi-province') return true;

      const vendorProv = String(vendor.province || "").toLowerCase().trim();
      const vendorProvinces: string[] = Array.isArray(vendor.provinces) 
        ? vendor.provinces.map(p => String(p).toLowerCase().trim()) 
        : [];
      if (vendorProv === userProv || vendorProvinces.includes(userProv)) return true;

      const vendorRegion = String(vendor.region || "").toLowerCase().trim();
      const vendorRegions: string[] = Array.isArray(vendor.regions) 
        ? vendor.regions.map(r => String(r).toLowerCase().trim()) 
        : [];
      if (vendorRegion === userCity || vendorRegions.includes(userCity)) return true;

      return false;
    }).slice(0, 4);
  }, [featuredVendors, locationCity, locationProvince]);

  // Handle specialty category search
  const handleSearch = (catName: string) => {
    if (!locationCity && !locationProvince) {
      alert("Location Required: Please detect or set your location first to find elite local pros.");
      return;
    }
    setSelectedCategory(catName);
    setCurrentPage('results');
  };

  // Perform search results filtering
  const matchingProsList = useMemo(() => {
    return allVendors.filter((pro: any) => {
      const matchesCategory = String(pro.category || "").toLowerCase().includes(selectedCategory.toLowerCase());
      
      if (!matchesCategory) return false;

      // Location match
      if (!locationProvince && !locationCity) return true;
      
      const proProv = String(pro.province || "").toLowerCase().trim();
      const proCity = String(pro.region || "").toLowerCase().trim();
      const userProv = locationProvince.toLowerCase().trim();
      const userCity = locationCity.toLowerCase().trim();

      const tier = String(pro.tier || "").toLowerCase().trim();
      if (tier === 'multi-province') return true;

      if (proProv === userProv) return true;
      if (proCity === userCity) return true;

      return false;
    });
  }, [allVendors, selectedCategory, locationCity, locationProvince]);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentPage('home');
  };

  // Auth screen guard
  if (!user && !loading) {
    return <Auth onSuccess={() => setCurrentPage('home')} />;
  }

  // Terms and conditions acceptance guard
  if (user && !hasAcceptedTerms && !loading) {
    return <Terms userId={user.uid} onAccepted={() => setHasAcceptedTerms(true)} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col selection:bg-gold-500 selection:text-navy-950">
      
      {/* GLOBAL SLYZAH HEADER BAR */}
      <header className="sticky top-0 z-40 shrink-0 border-b border-navy-900 bg-navy-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentPage('home'); setQuoteRequestMode(false); }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-navy-900 to-navy-850 border border-gold-500/30 text-gold-500">
              <span className="font-display text-xl font-black">S</span>
            </div>
            <div>
              <h1 className="font-display text-lg font-black tracking-tight uppercase">
                SLYZAH <span className="text-gold-500">CLIENT</span>
              </h1>
              <p className="text-[9px] font-black tracking-widest text-gold-500/80 uppercase">VERIFIED ELITE PROS</p>
            </div>
          </div>

          {/* Desktop Nav Actions */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-black tracking-wider uppercase">
            <button 
              onClick={() => { setCurrentPage('home'); setQuoteRequestMode(false); }} 
              className={`flex items-center gap-2 hover:text-gold-500 transition ${currentPage === 'home' ? 'text-gold-500' : 'text-slate-300'}`}
            >
              <Home className="h-4 w-4" /> Home
            </button>
            <button 
              onClick={() => { setCurrentPage('dashboard'); setQuoteRequestMode(false); }} 
              className={`flex items-center gap-2 hover:text-gold-500 transition ${currentPage === 'dashboard' ? 'text-gold-500' : 'text-slate-300'}`}
            >
              <FileText className="h-4 w-4" /> My Requests
            </button>
            <button 
              onClick={() => { setCurrentPage('profile'); setQuoteRequestMode(false); }} 
              className={`flex items-center gap-2 hover:text-gold-500 transition ${currentPage === 'profile' ? 'text-gold-500' : 'text-slate-300'}`}
            >
              <User className="h-4 w-4" /> My Profile
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {/* Geolocation selector display in Header */}
            <div 
              onClick={handleDetectLocation}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-navy-800 bg-navy-900/40 px-4 py-2 hover:border-gold-500/30 cursor-pointer transition text-xs font-semibold"
            >
              <MapPin className="h-3.5 w-3.5 text-gold-500" />
              <span>
                {geoLoading ? "Locating..." : locationCity ? `${locationCity}` : "Set Location"}
              </span>
            </div>

            <button 
              onClick={handleLogout} 
              className="hidden md:flex p-2.5 rounded-xl border border-navy-800 bg-navy-900/30 hover:border-red-500/30 hover:text-red-400 transition"
              title="Logout Securely"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="p-2 md:hidden text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE NAV DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-navy-900 bg-navy-950 p-4 space-y-3 z-30 flex flex-col text-sm font-bold uppercase tracking-wider">
          <button 
            onClick={() => { setCurrentPage('home'); setQuoteRequestMode(false); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 py-2 ${currentPage === 'home' ? 'text-gold-500' : 'text-slate-300'}`}
          >
            <Home className="h-5 w-5" /> Home
          </button>
          <button 
            onClick={() => { setCurrentPage('dashboard'); setQuoteRequestMode(false); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 py-2 ${currentPage === 'dashboard' ? 'text-gold-500' : 'text-slate-300'}`}
          >
            <FileText className="h-5 w-5" /> My Requests
          </button>
          <button 
            onClick={() => { setCurrentPage('profile'); setQuoteRequestMode(false); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 py-2 ${currentPage === 'profile' ? 'text-gold-500' : 'text-slate-300'}`}
          >
            <User className="h-5 w-5" /> Profile
          </button>
          <button 
            onClick={handleDetectLocation}
            className="flex items-center gap-3 py-2 text-slate-300"
          >
            <MapPin className="h-5 w-5 text-gold-500" /> Location: {locationCity || "Not set"}
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 py-2 text-red-400 border-t border-navy-900 pt-3"
          >
            <LogOut className="h-5 w-5" /> Logout
          </button>
        </div>
      )}

      {/* SLYZAH PULSE TICKER FEED */}
      {pulseLeads.length > 0 && currentPage === 'home' && !quoteRequestMode && (
        <div className="bg-navy-950/40 border-b border-navy-900 py-3 overflow-hidden shrink-0">
          <div className="mx-auto max-w-7xl px-4 flex items-center justify-center gap-3">
            <span className="h-2 w-2 rounded-full bg-gold-500 animate-ping"></span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">
              SLYZAH PULSE: Someone in <span className="text-gold-500 font-bold">{pulseLeads[pulseIndex]?.town || "South Africa"}</span> just requested a <span className="text-gold-500 font-bold">{pulseLeads[pulseIndex]?.category}</span> estimate.
            </span>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto">
        
        {/* VIEW: QUOTE REQUEST MODE OVERLAY (Wizard overrides other views) */}
        {quoteRequestMode ? (
          <RequestQuote 
            category={selectedCategory}
            userRegion={locationCity || "Cape Town CBD"}
            selectedVendorIds={directQuoteVendorId ? [directQuoteVendorId] : []}
            onBack={() => setQuoteRequestMode(false)}
            onSubmitSuccess={() => {
              setQuoteRequestMode(false);
              setDirectQuoteVendorId(null);
              setCurrentPage('dashboard');
            }}
          />
        ) : (
          <>
            {/* VIEW: HOME PAGE */}
            {currentPage === 'home' && (
              <div className="space-y-12 pb-16">
                
                {/* HERO BANNER SECTION */}
                <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 to-slate-950 py-16 md:py-24 border-b border-navy-900/40">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row items-center gap-12">
                    
                    <div className="flex-1 space-y-6 text-center md:text-left">
                      <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/20 bg-gold-500/5 px-4 py-1.5 text-xs font-bold text-gold-500 tracking-wider uppercase">
                        <Sparkles className="h-4 w-4 animate-spin-slow" />
                        SOUTH AFRICA'S ELITE PRO NETWORK
                      </div>
                      <h2 className="font-display text-4xl font-black leading-tight text-white md:text-6xl uppercase tracking-tight">
                        Smarter Service.<br />
                        <span className="text-gold-500">Faster Quotes.</span>
                      </h2>
                      <p className="text-slate-400 text-sm md:text-base max-w-lg leading-relaxed">
                        Connect with highly vetted, PIRB licensed plumbers, registered electricians, CIPC verified solar installers, and local builders. Real-time status updates and direct quote comparisons.
                      </p>

                      {/* Main Location Box and Actions */}
                      <div className="max-w-md bg-navy-950 border border-navy-850 p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-navy-900/60 border border-navy-800 rounded-2xl w-full">
                          <MapPin className="h-4 w-4 text-gold-500" />
                          <span className="text-xs font-semibold text-slate-300">
                            {locationCity ? `${locationCity}, ${locationProvince}` : "No Location Detected"}
                          </span>
                        </div>
                        <button 
                          onClick={handleDetectLocation}
                          disabled={geoLoading}
                          className="w-full sm:w-auto bg-gold-500 text-navy-950 font-display font-black text-xs px-6 py-3.5 rounded-2xl uppercase tracking-wider whitespace-nowrap shrink-0 transition active:scale-95 hover:bg-gold-600"
                        >
                          {geoLoading ? "DETECTING..." : "📍 DETECT REGION"}
                        </button>
                      </div>
                    </div>

                    {/* Aesthetic Side Card */}
                    <div className="flex-1 w-full max-w-md bg-navy-950 border border-navy-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                      <div className="flex items-center justify-between border-b border-navy-900 pb-4">
                        <h4 className="font-display font-black text-white text-sm uppercase tracking-wider">Trusted Ecosystem Guarantees</h4>
                        <Award className="h-5 w-5 text-gold-500" />
                      </div>
                      
                      <div className="space-y-4 text-xs font-semibold">
                        <div className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0"><Check className="h-4 w-4" /></div>
                          <div>
                            <p className="text-white uppercase tracking-wide">CIPC &amp; OCR Verification Badge</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Licensed profiles with secure cloud validation records.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-lg bg-gold-500/10 text-gold-500 flex items-center justify-center shrink-0"><Zap className="h-4 w-4" /></div>
                          <div>
                            <p className="text-white uppercase tracking-wide">Rapid 15m Response Badges</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Instant alerts dispatched directly to matching vendors.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><ShieldCheck className="h-4 w-4" /></div>
                          <div>
                            <p className="text-white uppercase tracking-wide">Secure Client Escrow Ready</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Your contact details remain confidential until you choose the quote winner.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </section>

                {/* PREMIUM SERVICE GRID */}
                <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                  <div className="text-center md:text-left">
                    <h3 className="font-display text-xl font-black text-white uppercase tracking-wider">Popular Service Specialties</h3>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Select a category to view local professionals</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {CATEGORIES.map((cat) => (
                      <div 
                        key={cat.name}
                        onClick={() => handleSearch(cat.name)}
                        className="p-5 rounded-3xl bg-navy-950 border border-navy-850 hover:border-gold-500/50 cursor-pointer group transition duration-300 hover:shadow-xl hover:shadow-black/40"
                      >
                        <div className="text-3xl mb-3 group-hover:scale-110 transition duration-200">{cat.icon}</div>
                        <h4 className="font-bold text-white text-sm uppercase group-hover:text-gold-500 transition">{cat.label}</h4>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{cat.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* FEATURED PROFESSIONALS SECTION */}
                <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                  <div className="flex justify-between items-end border-b border-navy-900 pb-4">
                    <div>
                      <h3 className="font-display text-xl font-black text-white uppercase tracking-wider">FEATURED SOUTH AFRICAN PROS</h3>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Elite vetted responders in your detected province</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredFeaturedVendors.map((vendor) => (
                      <div 
                        key={vendor.id}
                        className="bg-navy-950 border border-navy-850 rounded-3xl overflow-hidden shadow-lg hover:border-slate-800 transition duration-300"
                      >
                        {/* Featured Header Card */}
                        <div className="bg-gradient-to-r from-navy-900 to-navy-850 p-5 relative border-b border-navy-900">
                          <span className="absolute top-3 right-3 bg-gold-500 text-navy-950 font-black tracking-widest text-[8px] px-2 py-0.5 rounded-md uppercase">FEATURED</span>
                          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-navy-950 text-white font-black text-sm uppercase border border-navy-850 shadow-md">
                            {vendor.name.charAt(0)}
                          </div>
                          <h4 className="font-bold text-white text-sm mt-3 line-clamp-1">{vendor.name}</h4>
                          <p className="text-[10px] text-gold-500 uppercase font-bold tracking-wider mt-1">{vendor.category}</p>
                        </div>

                        {/* Info details */}
                        <div className="p-5 space-y-4">
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{vendor.description}</p>
                          
                          <div className="flex items-center justify-between text-xs font-bold border-t border-navy-900 pt-3">
                            <span className="flex items-center gap-1 text-gold-500">
                              ★ <span className="text-slate-300">{vendor.rating || "5.0"}</span>
                            </span>
                            <span className="text-slate-400">📍 {vendor.region || vendor.province}</span>
                          </div>

                          <button 
                            onClick={() => setSelectedVendorDetail(vendor)}
                            className="w-full py-2.5 rounded-2xl bg-navy-900 text-gold-500 border border-gold-500/20 text-xs font-black font-display tracking-widest uppercase transition hover:bg-gold-500 hover:text-navy-950"
                          >
                            VIEW DETAILS
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

              </div>
            )}

            {/* VIEW: RESULTS PAGE */}
            {currentPage === 'results' && (
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                
                {/* Back Link & Info header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-navy-900 pb-5 gap-4">
                  <div>
                    <button 
                      onClick={() => setCurrentPage('home')}
                      className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold mb-2"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to home
                    </button>
                    <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight">
                      {selectedCategory} SPECIALISTS IN <span className="text-gold-500">{locationCity}</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                      Matched local operators ready to submit rapid estimates
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setDirectQuoteVendorId(null);
                      setQuoteRequestMode(true);
                    }}
                    className="flex items-center gap-2 bg-gold-500 text-navy-950 font-display font-black text-xs px-6 py-3 rounded-2xl uppercase tracking-widest transition hover:scale-[1.01]"
                  >
                    <Zap className="h-4 w-4" />
                    SEND DIRECT INQUIRY
                  </button>
                </div>

                {/* Matches Grid */}
                {matchingProsList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {matchingProsList.map((pro) => (
                      <div 
                        key={pro.id}
                        className="bg-navy-950 border border-navy-850 hover:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-navy-900 text-white font-black text-sm uppercase border border-navy-850">
                              {pro.name.charAt(0)}
                            </div>
                            
                            <div className="flex gap-2">
                              {pro.rapidResponder && (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black tracking-widest px-2 py-0.5 rounded uppercase">⚡ 15m</span>
                              )}
                              {pro.cipcVerified && (
                                <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black tracking-widest px-2 py-0.5 rounded uppercase">CIPC Vetted</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-white text-sm md:text-base line-clamp-1">{pro.name}</h4>
                            <p className="text-[10px] text-gold-500 uppercase font-black tracking-wider mt-0.5">{pro.category}</p>
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{pro.description}</p>
                        </div>

                        <div className="border-t border-navy-900 pt-4 mt-5 space-y-4">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="flex items-center gap-1 text-gold-500">★ {pro.rating || "5.0"}</span>
                            <span className="text-slate-400">📍 {pro.region || pro.town || pro.province}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => setSelectedVendorDetail(pro)}
                              className="py-2.5 rounded-xl border border-navy-800 bg-navy-900/40 text-slate-300 font-display font-black text-[10px] uppercase tracking-wider hover:border-slate-700 hover:text-white"
                            >
                              Details
                            </button>
                            <button 
                              onClick={() => {
                                setDirectQuoteVendorId(pro.id);
                                setQuoteRequestMode(true);
                              }}
                              className="py-2.5 rounded-xl bg-gold-500 text-navy-950 font-display font-black text-[10px] uppercase tracking-wider hover:bg-gold-600"
                            >
                              GET QUOTE
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-navy-950 border border-navy-850 rounded-3xl max-w-2xl mx-auto space-y-4">
                    <MapPin className="mx-auto h-12 w-12 text-slate-600" />
                    <h3 className="text-lg font-bold text-white">No Pros Located</h3>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                      We didn't locate any direct {selectedCategory} matches matching {locationCity} yet. You can submit a broad lead anyway!
                    </p>
                    <button
                      onClick={() => {
                        setDirectQuoteVendorId(null);
                        setQuoteRequestMode(true);
                      }}
                      className="px-6 py-3 bg-gold-500 text-navy-950 rounded-xl font-display font-black text-xs uppercase tracking-widest"
                    >
                      SEND PUBLIC INQUIRY
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* VIEW: REQUESTS DASHBOARD */}
            {currentPage === 'dashboard' && (
              <Dashboard 
                onOpenChat={(chatId) => {
                  setActiveChatId(chatId);
                  setCurrentPage('chat');
                }}
              />
            )}

            {/* VIEW: ACTIVE CHAT SCREEN */}
            {currentPage === 'chat' && activeChatId && (
              <Chat 
                chatId={activeChatId}
                onBack={() => setCurrentPage('dashboard')}
              />
            )}

            {/* VIEW: USER PROFILE PAGE */}
            {currentPage === 'profile' && (
              <div className="mx-auto max-w-5xl px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left Column: Account Profile Info */}
                <div className="bg-navy-950 border border-navy-850 rounded-3xl p-6 md:p-8 space-y-6 h-fit">
                  <div className="text-center">
                    <div className="h-16 w-16 mx-auto flex items-center justify-center rounded-2xl bg-gradient-to-br from-navy-900 to-navy-850 border border-gold-500/30 text-gold-500 font-display text-2xl font-black">
                      {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <h3 className="text-xl font-bold text-white mt-4">{user?.displayName || "Slyzah User"}</h3>
                    <p className="text-xs text-gold-500 font-bold tracking-widest uppercase mt-0.5">Verified Client Account</p>
                  </div>

                  <div className="border-t border-navy-900 pt-5 space-y-4 text-sm text-slate-300">
                    <div className="flex justify-between items-center py-2 border-b border-navy-900/50">
                      <span className="text-slate-500 font-bold uppercase text-xs">Email Address</span>
                      <span className="text-white font-medium">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-navy-900/50">
                      <span className="text-slate-500 font-bold uppercase text-xs">Account Type</span>
                      <span className="text-white font-medium capitalize">{userRole || "Client"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500 font-bold uppercase text-xs">System Status</span>
                      <span className="flex items-center gap-1 text-emerald-400 font-bold uppercase text-xs">
                        <ShieldCheck className="h-4 w-4" /> Secured CoC Line
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-black font-display tracking-widest uppercase transition"
                  >
                    <LogOut className="h-4 w-4" /> LOGOUT FROM CLIENT APP
                  </button>
                </div>

                {/* Right Column: Legal, PayFast & Regulatory Parity Info */}
                <div className="bg-navy-950 border border-navy-850 rounded-3xl p-6 md:p-8 space-y-6">
                  <div>
                    <h4 className="font-display font-black text-white text-md uppercase tracking-wider">
                      Ecosystem Parity &amp; Legal Center
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                      South African compliance guidelines &amp; service level agreements
                    </p>
                  </div>

                  <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-2 scrollbar-thin scrollbar-thumb-navy-900">
                    {/* PayFast Integration */}
                    <div className="p-4 rounded-2xl bg-navy-900/40 border border-navy-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gold-500 uppercase tracking-wider">🔒 PayFast Escrow Protection</span>
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black tracking-widest px-2 py-0.5 rounded uppercase">PayFast ESCROW</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Funds committed to matching estimates are secured in a trust escrow account via PayFast. Payment is only released to the professional upon successful milestone sign-off inside your client dashboard.
                      </p>
                    </div>

                    {/* Consumer Protection Act */}
                    <div className="p-4 rounded-2xl bg-navy-900/40 border border-navy-900 space-y-2">
                      <span className="text-xs font-black text-gold-500 uppercase tracking-wider block">⚖️ Consumer Protection Act (CPA)</span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        In accordance with South African law, all work scheduled on the Slyzah marketplace is covered under general merchant warranties. Any subcontractor dispute is audited in compliance with the Consumer Protection Act 68 of 2008.
                      </p>
                    </div>

                    {/* Certificates of Compliance (CoC) */}
                    <div className="p-4 rounded-2xl bg-navy-900/40 border border-navy-900 space-y-2">
                      <span className="text-xs font-black text-gold-500 uppercase tracking-wider block">📜 Certificate of Compliance (CoC) Rules</span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Registered electrical contractors and plumbing installers are mandated to provide legal Certificates of Compliance (CoC) or PIRB logbooks for all major modifications, geyser installations, and DB board integrations.
                      </p>
                    </div>

                    {/* Cancellation & Refund Policy */}
                    <div className="p-4 rounded-2xl bg-navy-900/40 border border-navy-900 space-y-2">
                      <span className="text-xs font-black text-gold-500 uppercase tracking-wider block">🔄 Cancellation &amp; Refund Policy</span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Cancellations done at least 2 hours before the professional's scheduled call-out are refunded 100% directly to the client's original wallet. Emergencies dispatched with standard rapid responder SLAs may charge a nominal booking fee.
                      </p>
                    </div>

                    {/* News Announcements */}
                    <div className="p-4 rounded-2xl bg-navy-900/40 border border-navy-900 space-y-2">
                      <span className="text-xs font-black text-gold-500 uppercase tracking-wider block">📢 Latest Announcements (Jul 2026)</span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Plumbing, electrical, and solar categories now feature automated licensing audits. Every pro displaying the CIPC Verification Badge has cleared full active regulatory registry scans.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}

      </main>

      {/* FOOTER NAV BAR (Aesthetic mobile touch support / Desktop credentials summary) */}
      <footer className="border-t border-navy-900 bg-navy-950 py-4 shrink-0 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-slate-500">
            &copy; 2026 Slyzah (Pty) Ltd. South Africa. Elite Professional Service Marketplace. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Secure encryption CoC verification</span>
          </div>
        </div>
      </footer>

      {/* MOBILE NAV FOOTER FLOATING RAIL */}
      <div className="md:hidden border-t border-navy-900 bg-navy-950 py-2.5 px-6 flex justify-around items-center sticky bottom-0 z-40 backdrop-blur-md">
        <button 
          onClick={() => { setCurrentPage('home'); setQuoteRequestMode(false); }}
          className={`flex flex-col items-center gap-1 ${currentPage === 'home' ? 'text-gold-500' : 'text-slate-400'}`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[9px] font-bold tracking-wide uppercase">Home</span>
        </button>
        <button 
          onClick={() => { setCurrentPage('dashboard'); setQuoteRequestMode(false); }}
          className={`flex flex-col items-center gap-1 ${currentPage === 'dashboard' ? 'text-gold-500' : 'text-slate-400'}`}
        >
          <FileText className="h-5 w-5" />
          <span className="text-[9px] font-bold tracking-wide uppercase">Requests</span>
        </button>
        <button 
          onClick={() => { setCurrentPage('profile'); setQuoteRequestMode(false); }}
          className={`flex flex-col items-center gap-1 ${currentPage === 'profile' ? 'text-gold-500' : 'text-slate-400'}`}
        >
          <User className="h-5 w-5" />
          <span className="text-[9px] font-bold tracking-wide uppercase">Profile</span>
        </button>
      </div>

      {/* DETAILED PROFESSIONAL MODAL DISPLAY */}
      {selectedVendorDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-navy-950 border border-navy-850 rounded-3xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-navy-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-navy-900 text-gold-500 border border-gold-500/20 font-black text-lg">
                  {selectedVendorDetail.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{selectedVendorDetail.name}</h3>
                  <span className="text-xs text-gold-500 font-bold uppercase tracking-wider">{selectedVendorDetail.category}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVendorDetail(null)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-navy-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-slate-300">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase block mb-1">About our Services</span>
                <p className="bg-navy-900/30 border border-navy-900 p-4 rounded-2xl italic">"{selectedVendorDetail.description}"</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase">
                <div>
                  <span className="text-slate-500 block mb-1">PROVINCE</span>
                  <span className="text-white">📍 {selectedVendorDetail.province}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">REGION COVERED</span>
                  <span className="text-white">📍 {selectedVendorDetail.region || "All Suburbs"}</span>
                </div>
              </div>

              {/* Special Credentials mapping display */}
              {(selectedVendorDetail.pirbNumber || selectedVendorDetail.wiremanNumber || selectedVendorDetail.pvGreenCardNumber) && (
                <div className="p-4 bg-gold-500/10 border border-gold-500/20 rounded-2xl">
                  <span className="text-xs text-gold-500 font-black tracking-widest uppercase block mb-2">🛡️ VETTED PROFESSIONAL LICENSE</span>
                  {selectedVendorDetail.pirbNumber && <p className="text-xs font-bold text-white">PIRB Licensed: <span className="font-mono">{selectedVendorDetail.pirbNumber}</span></p>}
                  {selectedVendorDetail.wiremanNumber && <p className="text-xs font-bold text-white">Wireman's License: <span className="font-mono">{selectedVendorDetail.wiremanNumber}</span></p>}
                  {selectedVendorDetail.pvGreenCardNumber && <p className="text-xs font-bold text-white">PV GreenCard: <span className="font-mono">{selectedVendorDetail.pvGreenCardNumber}</span></p>}
                </div>
              )}

              {selectedVendorDetail.website && (
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase block mb-1">Professional Website</span>
                  <a 
                    href={selectedVendorDetail.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gold-500 hover:underline font-bold"
                  >
                    {selectedVendorDetail.website}
                  </a>
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                setDirectQuoteVendorId(selectedVendorDetail.id);
                setSelectedVendorDetail(null);
                setQuoteRequestMode(true);
              }}
              className="w-full py-4 rounded-2xl bg-gold-500 text-navy-950 font-display font-black text-xs uppercase tracking-widest transition hover:scale-[1.01]"
            >
              REQUEST DIRECT QUOTE
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
