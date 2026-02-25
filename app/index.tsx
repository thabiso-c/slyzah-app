import { Ionicons } from '@expo/vector-icons';
import { useAssets } from 'expo-asset';
import { ResizeMode, Video } from 'expo-av';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDocs, limit, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// FIXED: Correct import path (one level up)
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

const THEME = {
  navy: '#001f3f',
  gold: '#FFD700',
  white: '#FFFFFF',
  gray: '#F3F4F6',
  placeholder: '#9CA3AF',
};

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
  // Western Cape
  "brackenfell": "Northern Suburbs", "bellville": "Northern Suburbs", "durbanville": "Northern Suburbs",
  "parow": "Northern Suburbs", "goodwood": "Northern Suburbs", "kraaifontein": "Northern Suburbs",
  "kuils river": "Northern Suburbs", "century city": "Northern Suburbs", "edgemead": "Northern Suburbs",
  "bothasig": "Northern Suburbs", "monte vista": "Northern Suburbs", "plattekloof": "Northern Suburbs",
  "scottdene": "Northern Suburbs", "scottsdene": "Northern Suburbs", "northpine": "Northern Suburbs",
  "wallacedene": "Northern Suburbs", "bloekombos": "Northern Suburbs", "belmont park": "Northern Suburbs",
  "tyger valley": "Northern Suburbs", "welgemoed": "Northern Suburbs", "loevenstein": "Northern Suburbs",
  "morgen industria": "Northern Suburbs",
  "milnerton": "Western Seaboard", "table view": "Western Seaboard", "blouberg": "Western Seaboard",
  "parklands": "Western Seaboard", "sunningdale": "Western Seaboard", "west beach": "Western Seaboard", "big bay": "Western Seaboard", "sunset beach": "Western Seaboard", "melkbosstrand": "Western Seaboard",
  "claremont": "Southern Suburbs", "rondebosch": "Southern Suburbs", "newlands": "Southern Suburbs",
  "wynberg": "Southern Suburbs", "kenilworth": "Southern Suburbs", "observatory": "Southern Suburbs",
  "mowbray": "Southern Suburbs", "pinelands": "Southern Suburbs", "tokai": "Southern Suburbs",
  "constantia": "Southern Suburbs", "bergvliet": "Southern Suburbs", "plumstead": "Southern Suburbs",
  "sea point": "Atlantic Seaboard", "camps bay": "Atlantic Seaboard", "clifton": "Atlantic Seaboard",
  "green point": "Atlantic Seaboard", "hout bay": "Atlantic Seaboard", "mouille point": "Atlantic Seaboard",
  "gardens": "Cape Town CBD", "vredehoek": "Cape Town CBD",
  "fish hoek": "South Peninsula", "simon's town": "South Peninsula", "muizenberg": "South Peninsula",
  "noordhoek": "South Peninsula", "kommetjie": "South Peninsula", "kalk bay": "South Peninsula",
  "somerset west": "Cape Helderberg", "strand": "Cape Helderberg", "gordon's bay": "Cape Helderberg",

  // Gauteng
  "sandton": "Sandton/Rivonia", "rivonia": "Sandton/Rivonia", "bryanston": "Sandton/Rivonia",
  "fourways": "Sandton/Rivonia", "lonehill": "Sandton/Rivonia", "sunninghill": "Sandton/Rivonia",
  "woodmead": "Sandton/Rivonia", "morningside": "Sandton/Rivonia",
  "randburg": "Randburg", "ferndale": "Randburg", "northcliff": "Randburg", "cresta": "Randburg",
  "midrand": "Midrand", "halfway house": "Midrand", "kyalami": "Midrand", "waterfall": "Midrand",
  "centurion": "Centurion", "lyttelton": "Centurion", "irene": "Centurion",
  "kempton park": "Kempton Park", "benoni": "Brakpan/Benoni", "brakpan": "Brakpan/Benoni",
  "boksburg": "Ekurhuleni (East Rand)", "germiston": "Ekurhuleni (East Rand)", "alberton": "Ekurhuleni (East Rand)",
  "edenvale": "Ekurhuleni (East Rand)", "bedfordview": "Ekurhuleni (East Rand)",
  "roodepoort": "Roodepoort", "florida": "Roodepoort", "weltevreden park": "Roodepoort", "ruimsig": "Roodepoort", "little falls": "Roodepoort",
  "soweto": "Soweto", "diepkloof": "Soweto", "orlando": "Soweto", "dobsonville": "Soweto", "protea glen": "Soweto", "pimville": "Soweto", "jabulani": "Soweto",
  "braamfontein": "Johannesburg CBD", "newtown": "Johannesburg CBD", "marshalltown": "Johannesburg CBD", "hillbrow": "Johannesburg CBD",
  "faerie glen": "Pretoria East", "garsfontein": "Pretoria East", "lynnwood": "Pretoria East", "menlo park": "Pretoria East", "waterkloof": "Pretoria East",
  "montana": "Pretoria North", "sinoville": "Pretoria North", "wonderboom": "Pretoria North", "akamasia": "Pretoria North",
  "krugersdorp": "West Rand", "randfontein": "West Rand", "muldersdrift": "West Rand", "mogale city": "West Rand",
  "springs": "Ekurhuleni (East Rand)", "nigel": "Ekurhuleni (East Rand)",
  "vanderbijlpark": "Sedibeng", "vereeniging": "Sedibeng", "meyerton": "Sedibeng",

  // KZN
  "umhlanga": "Umhlanga/Ballito", "ballito": "Umhlanga/Ballito", "durban north": "Durban North",
  "westville": "Pinetown/Westville", "pinetown": "Pinetown/Westville", "hillcrest": "Pinetown/Westville",
  "kloof": "Pinetown/Westville", "berea": "Durban Central", "glenwood": "Durban Central",
  "amanzimtoti": "Amanzimtoti", "kingsburgh": "Amanzimtoti",
  "bluff": "Durban South", "chatsworth": "Durban South", "isipingo": "Durban South", "yellowwood park": "Durban South", "queensburgh": "Durban South",
  "pietermaritzburg": "Pietermaritzburg", "scottsville": "Pietermaritzburg", "northdale": "Pietermaritzburg", "hilton": "uMgungundlovu", "howick": "uMgungundlovu",
  "richards bay": "King Cetshwayo/Richards Bay", "empangeni": "King Cetshwayo/Richards Bay",
  "port shepstone": "Ugu (South Coast)", "margate": "Ugu (South Coast)", "shelly beach": "Ugu (South Coast)",
  "newcastle": "Newcastle", "madadeni": "Newcastle",

  // Eastern Cape
  "gqeberha": "Gqeberha (Port Elizabeth)", "summerstrand": "Gqeberha (Port Elizabeth)", "walmer": "Gqeberha (Port Elizabeth)", "newton park": "Gqeberha (Port Elizabeth)", "lorraine": "Gqeberha (Port Elizabeth)",
  "beacon bay": "East London (Buffalo City)", "gonubie": "East London (Buffalo City)", "vincent": "East London (Buffalo City)", "nahoon": "East London (Buffalo City)",
  "mthatha": "Mthatha",
  "jeffreys bay": "Sarah Baartman", "makhanda": "Sarah Baartman",

  // Free State
  "universitas": "Bloemfontein (Mangaung)", "langenhoven park": "Bloemfontein (Mangaung)", "fichardt park": "Bloemfontein (Mangaung)",
  "welkom": "Welkom", "sasolburg": "Sasolburg", "bethlehem": "Bethlehem", "parys": "Fezile Dabi",

  // Limpopo
  "bendor": "Polokwane (Capricorn)", "flora park": "Polokwane (Capricorn)", "seshego": "Polokwane (Capricorn)",
  "thohoyandou": "Thohoyandou (Vhembe)", "tzaneen": "Tzaneen (Mopani)", "phalaborwa": "Tzaneen (Mopani)",
  "bela-bela": "Bela-Bela", "modimolle": "Waterberg", "lephalale": "Waterberg",

  // Mpumalanga
  "mbombela": "Nelspruit (Ehlanzeni)", "west acres": "Nelspruit (Ehlanzeni)", "sonheuwel": "Nelspruit (Ehlanzeni)",
  "emalahleni": "Witbank (Nkangala)", "reyno ridge": "Witbank (Nkangala)",
  "secunda": "Secunda (Gert Sibande)", "middelburg": "Middelburg", "white river": "White River",

  // North West
  "geelhoutpark": "Rustenburg (Bojanala)",
  "baillie park": "Potchefstroom (Dr Kenneth Kaunda)",
  "klerksdorp": "Klerksdorp", "brits": "Brits", "hartbeespoort": "Brits",

  // Northern Cape
  "royldene": "Kimberley (Frances Baard)", "monument heights": "Kimberley (Frances Baard)",
  "upington": "Upington", "kathu": "John Taolo Gaetsewe", "kuruman": "John Taolo Gaetsewe", "springbok": "Namakwa", "de aar": "Pixley ka Seme",

  // General
  "stellenbosch": "Stellenbosch", "paarl": "Paarl/Wellington", "wellington": "Paarl/Wellington"
};

const POSTAL_CODE_TO_REGION_MAP: Record<string, string> = {
  // Western Cape
  "7570": "Northern Suburbs", // Kraaifontein, Scottsdene, Wallacedene
  "7560": "Northern Suburbs", // Brackenfell
  "7550": "Northern Suburbs", // Durbanville
  "7500": "Northern Suburbs", // Parow
  "7460": "Northern Suburbs", // Goodwood
  "7580": "Northern Suburbs", // Kuils River
  "7441": "Western Seaboard", // Milnerton, Table View, Parklands
  "7446": "Western Seaboard", // Blouberg
  "7530": "Northern Suburbs", // Bellville
  "7535": "Northern Suburbs", // Bellville (Stikland)
  "8001": "Cape Town CBD",
  "8000": "Cape Town CBD",
  "7700": "Southern Suburbs", // Rondebosch
  "7708": "Southern Suburbs", // Claremont
  "7800": "Southern Suburbs", // Plumstead
  "7945": "South Peninsula", // Muizenberg
  "7975": "South Peninsula", // Fish Hoek
  "7130": "Cape Helderberg", // Somerset West
  "7140": "Cape Helderberg", // Strand
  "7600": "Stellenbosch",
  "7646": "Paarl/Wellington", // Paarl

  // Cape Winelands (Excluding Paarl/Stellenbosch which have their own keys)
  "6850": "Cape Winelands", // Worcester
  "6835": "Cape Winelands", // Ceres
  "6705": "Cape Winelands", // Robertson
  "6720": "Cape Winelands", // Montagu
  "6875": "Cape Winelands", // De Doorns
  "6880": "Cape Winelands", // Touws River

  // West Coast
  "7357": "West Coast", // Langebaan
  "7380": "West Coast", // Vredenburg
  "7395": "West Coast", // Saldanha
  "7300": "West Coast", // Malmesbury
  "7351": "West Coast", // Yzerfontein
  "7345": "West Coast", // Darling
  "7310": "West Coast", // Moorreesburg
  "8160": "West Coast", // Vredendal

  // Garden Route
  "6500": "Garden Route", // Mossel Bay
  "6520": "Garden Route", // Hartenbos
  "6670": "Garden Route", // Riversdale
  "6674": "Garden Route", // Stilbaai
  "6665": "Garden Route", // Heidelberg

  // George/Knysna
  "6529": "George/Knysna", // George
  "6530": "George/Knysna", // George
  "6560": "George/Knysna", // Wilderness
  "6570": "George/Knysna", // Knysna
  "6571": "George/Knysna", // Knysna
  "6573": "George/Knysna", // Sedgefield
  "6600": "George/Knysna", // Plettenberg Bay

  // Overberg
  "7200": "Overberg", // Hermanus
  "7230": "Overberg", // Caledon
  "7280": "Overberg", // Bredasdorp
  "6740": "Overberg", // Swellendam
  "7220": "Overberg", // Gansbaai
  "7215": "Overberg", // Kleinmond
  "7160": "Overberg", // Grabouw
  "7170": "Overberg", // Villiersdorp

  // Central Karoo
  "6970": "Central Karoo", // Beaufort West
  "6930": "Central Karoo", // Prince Albert
  "6900": "Central Karoo", // Laingsburg

  // Gauteng
  "2000": "Johannesburg CBD",
  "2001": "Johannesburg CBD",
  "2196": "Sandton/Rivonia", // Sandton
  "2128": "Sandton/Rivonia", // Rivonia
  "2191": "Sandton/Rivonia", // Bryanston
  "2194": "Randburg",
  "1709": "Roodepoort",
  "1724": "Roodepoort",
  "1804": "Soweto", // Orlando
  "1818": "Soweto", // Dobsonville
  "1685": "Midrand",
  "0002": "Pretoria/Tshwane CBD",
  "0157": "Centurion",
  "0081": "Pretoria East", // Lynnwood
  "0182": "Pretoria North",
  "1459": "Ekurhuleni (East Rand)", // Boksburg
  "1401": "Ekurhuleni (East Rand)", // Germiston
  "1609": "Ekurhuleni (East Rand)", // Edenvale
  "1619": "Kempton Park",
  "1501": "Brakpan/Benoni", // Benoni
  "1541": "Brakpan/Benoni", // Brakpan
  "1911": "Sedibeng", // Vanderbijlpark
  "1939": "Sedibeng", // Vereeniging
  "1739": "West Rand", // Krugersdorp

  // Kwa Zulu Natal
  "4001": "Durban Central",
  "4319": "Umhlanga/Ballito", // Umhlanga
  "4420": "Umhlanga/Ballito", // Ballito
  "4051": "Durban North",
  "4052": "Durban South", // Bluff
  "3610": "Pinetown/Westville", // Pinetown
  "3629": "Pinetown/Westville", // Westville
  "4126": "Amanzimtoti",
  "3201": "Pietermaritzburg",
  "3900": "King Cetshwayo/Richards Bay", // Richards Bay
  "2940": "Newcastle",

  // Eastern Cape
  "6001": "Gqeberha (Port Elizabeth)",
  "5201": "East London (Buffalo City)",
  "5099": "Mthatha",

  // Free State
  "9301": "Bloemfontein (Mangaung)",
  "9459": "Welkom",
  "1947": "Sasolburg",

  // North West
  "0299": "Rustenburg (Bojanala)",
  "2745": "Mahikeng",
  "2531": "Potchefstroom (Dr Kenneth Kaunda)",

  // Limpopo
  "0699": "Polokwane (Capricorn)",
  "0700": "Polokwane (Capricorn)",
  "0950": "Thohoyandou (Vhembe)",
  "0850": "Tzaneen (Mopani)",
  "1390": "Tzaneen (Mopani)", // Phalaborwa
  "0480": "Bela-Bela",
  "0510": "Waterberg", // Modimolle
  "0555": "Waterberg", // Lephalale
  "1120": "Sekhukhune", // Burgersfort

  // Mpumalanga
  "1200": "Nelspruit (Ehlanzeni)",
  "1201": "Nelspruit (Ehlanzeni)",
  "1035": "Witbank (Nkangala)",
  "1034": "Witbank (Nkangala)",
  "2302": "Secunda (Gert Sibande)",
  "1050": "Middelburg",
  "1240": "White River",

  // Northern Cape
  "8301": "Kimberley (Frances Baard)",
  "8300": "Kimberley (Frances Baard)",
  "8801": "Upington",
  "8460": "John Taolo Gaetsewe", // Kuruman
  "8240": "Namakwa", // Springbok
  "7000": "Pixley ka Seme", // De Aar
};

export default function HomeScreen() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationProvince, setLocationProvince] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [featuredVendors, setFeaturedVendors] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [assets] = useAssets([require('../assets/Golden_Man_Compares_Pages_Runs.mp4')]);

  const filteredFeaturedVendors = useMemo(() => {
    // If user has no location, show all featured vendors as a default.
    if (!locationProvince && !locationCity) {
      return featuredVendors;
    }

    const clean = (str: string) => (str || "").toLowerCase().trim();
    const userProv = clean(locationProvince);
    const userCity = clean(locationCity); // This is the region

    return featuredVendors.filter((vendor: any) => {
      const tier = clean(vendor.tier);

      // 1. National vendors are always shown
      if (tier === 'multi-province') {
        return true;
      }

      // 2. Check for province match (for Provincial, Multi-Province, etc.)
      const vendorProv = clean(vendor.province);
      const vendorProvinces: string[] = Array.isArray(vendor.provinces) ? vendor.provinces.map(clean) : [];
      if (userProv && (vendorProv === userProv || vendorProvinces.includes(userProv))) {
        return true;
      }

      // 3. Check for region match (for One Region, Three Regions, etc.)
      const vendorRegion = clean(vendor.region);
      const vendorRegions: string[] = Array.isArray(vendor.regions) ? vendor.regions.map(clean) : [];
      if (userCity && (vendorRegion === userCity || vendorRegions.includes(userCity))) {
        return true;
      }

    });
  }, [featuredVendors, locationCity, locationProvince]);
  /**
 * Triggers the Firebase "Trigger Email" extension to send a test email via Brevo.
 */
  const sendTestEmail = async () => {
    // --- 1. CONFIGURE RECIPIENT ---
    // IMPORTANT: Change this to a real email address you can check.
    const testRecipient = 'your-email@example.com';

    console.log(`[EMAIL TEST] Attempting to queue a test email to: ${testRecipient}`);
    Alert.alert('Sending Test Email', `Queuing email to ${testRecipient}...`);

    try {
      // --- 2. CREATE MAIL DOCUMENT ---
      // This adds a new document to your 'mail' collection in Firestore.
      const mailDocRef = await addDoc(collection(db, 'mail'), {
        to: [testRecipient],
        message: {
          subject: 'Slyzah Test',
          text: 'If you see this, the email system is working!',
        },
      });

      // --- 3. LOG & ALERT ---
      // This ID is crucial for tracking the email in your Firestore 'mail' collection.
      console.log(`[EMAIL TEST] ✅ Success! Mail document created with ID: ${mailDocRef.id}`);

      // --- 4. LISTEN FOR STATUS ---
      // Watch the document for the extension's response (SUCCESS or ERROR)
      const unsubscribe = onSnapshot(doc(db, 'mail', mailDocRef.id), (snapshot) => {
        const data = snapshot.data();
        const delivery = data?.delivery;

        if (delivery) {
          if (delivery.state === 'SUCCESS') {
            Alert.alert("✅ Email Sent", "The email was successfully handed off to Gmail.");
            unsubscribe();
          } else if (delivery.state === 'ERROR') {
            Alert.alert("❌ Email Failed", `Error: ${delivery.error}`);
            console.error("Email Delivery Error:", delivery.error);
            unsubscribe();
          }
        }
      });

    } catch (error) {
      console.error("[EMAIL TEST] ❌ Error creating mail document:", error);
      Alert.alert("Test Failed", "Could not create the email document. Check your console logs for the error.");
    }
  };


  // 1. Auth Check
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  // 2. Fetch Featured Vendors
  useEffect(() => {
    const fetchFeatured = async () => {
      const q = query(collection(db, "professionals"), limit(100));
      const snapshot = await getDocs(q);
      const allPros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const targetTiers = ["multi-province", "provincial", "three regions", "one region"];

      const featured = allPros.filter((vendor: any) => {
        const vendorTier = String(vendor.tier || "").toLowerCase().trim();
        const isPaidTier = targetTiers.includes(vendorTier);
        const isApprovedOrNew = vendor.isApproved !== false;
        return isPaidTier && isApprovedOrNew;
      });

      const sortedFeatured = featured.sort((a: any, b: any) => {
        const hierarchy: Record<string, number> = {
          "multi-province": 1,
          "provincial": 2,
          "three regions": 3,
          "one region": 4
        };
        const tierA = String(a.tier || "").toLowerCase().trim();
        const tierB = String(b.tier || "").toLowerCase().trim();
        return (hierarchy[tierA] || 99) - (hierarchy[tierB] || 99);
      });

      setFeaturedVendors(sortedFeatured);
    };
    fetchFeatured();
  }, []);

  // 3. Geolocation Logic
  const handleGetLocation = async () => {
    setGeoLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        setGeoLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      // Reverse Geocode to get city/province
      let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (address && address.length > 0) {
        const detected = address[0];
        const detectedProv = detected.region || "";
        const detectedPostalCode = detected.postalCode;

        // Gather all potential suburb/city names from the address object
        const potentialSuburbs = [
          detected.subregion,
          detected.district,
          detected.street, // Check street address for suburb name
          detected.name,   // Check location name for suburb name
          detected.city,
        ].filter(Boolean) as string[];

        let finalProvince = detectedProv;
        let finalCity = "";

        // Normalize string for comparison (remove non-alphanumeric)
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
        const pKey = Object.keys(LOCATION_MAPPING).find(k => normalize(k) === normalize(detectedProv));

        if (pKey) {
          finalProvince = pKey;
          const regions = LOCATION_MAPPING[pKey]

          // 1. Check Postal Code FIRST (Most accurate for specific areas like Kraaifontein)
          if (detectedPostalCode && POSTAL_CODE_TO_REGION_MAP[detectedPostalCode]) {
            const mappedRegion = POSTAL_CODE_TO_REGION_MAP[detectedPostalCode];
            if (regions.includes(mappedRegion)) {
              finalCity = mappedRegion;
            }
          }

          // 2. If no postal code match, try to map from Suburb -> Region using the map
          if (!finalCity) {
            for (const sub of potentialSuburbs) {
              const cleanSub = sub.toLowerCase().trim();
              if (SUBURB_TO_REGION_MAP[cleanSub]) {
                const mappedRegion = SUBURB_TO_REGION_MAP[cleanSub];
                // Verify this region exists in the province's list
                if (regions.includes(mappedRegion)) {
                  finalCity = mappedRegion;
                  break;
                }
              }
            }
          }

          // 3. If no map match, check if any potential suburb IS the region name
          if (!finalCity) {
            for (const sub of potentialSuburbs) {
              const match = regions.find(r => {
                const parts = r.split('/').map(p => p.trim().toLowerCase());
                return parts.some(part => sub.toLowerCase().includes(part));
              });
              if (match) {
                finalCity = match;
                break;
              }
            }
          }

          // 4. Fallback: If still nothing, use the first available city name
          if (!finalCity) {
            if (potentialSuburbs.length > 0) {
              finalCity = potentialSuburbs[0];
            } else {
              finalCity = finalProvince; // Ultimate fallback to Province if no city/suburb found
            }
          }
        }

        setLocationCity(finalCity);
        setLocationProvince(finalProvince);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSearch = (searchCat?: string) => {
    const finalCat = searchCat || category;
    if (!finalCat) return;

    // Navigate to Results
    router.push({
      pathname: "/results",
      params: { cat: finalCat, region: locationCity, province: locationProvince }
    });
  };

  const categories = [
    { name: "Plumber", icon: "water-outline" },
    { name: "Electrician", icon: "flash-outline" },
    { name: "Handyman", icon: "hammer-outline" },
    { name: "Solar", icon: "sunny-outline" },
    { name: "Locksmith", icon: "key-outline" },
    { name: "Cleaning", icon: "sparkles-outline" },
    { name: "Automotive", icon: "car-outline" }
  ];

  return (
    <View style={styles.container}>
      {assets && (
        <Video
          source={assets[0]}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          onError={(e) => console.log("Video Error:", e)}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 31, 63, 0.8)' }]} />

      <SafeAreaView style={{ flex: 1, zIndex: 1 }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>


          {/* --- HERO SECTION --- */}
          <View style={styles.heroContainer}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>SEARCH, COMPARE QUOTES & SLYZAH!!</Text>
              <Text style={styles.heroSubtitle}>VERIFIED PROFESSIONALS.</Text>

              {/* Search Box */}
              <View style={styles.searchBox}>
                <View style={styles.searchInputRow}>
                  <Ionicons name="search" size={20} color={THEME.navy} />
                  <TextInput
                    style={styles.input}
                    placeholder="What service do you need?"
                    placeholderTextColor={THEME.placeholder}
                    value={category}
                    onChangeText={setCategory}
                    onSubmitEditing={() => handleSearch()}
                  />
                </View>

                <View style={styles.searchActions}>
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={handleGetLocation}
                  >
                    <Text style={[styles.locationText, (locationCity || locationProvince) ? { color: 'green' } : {}]}>
                      {geoLoading ? "..." : (locationCity || locationProvince) ? `📍 ${locationCity}${locationCity && locationProvince ? ', ' : ''}${locationProvince}` : "📍 Detect Location"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.findButton}
                    onPress={() => handleSearch()}
                  >
                    <Text style={styles.findButtonText}>FIND PRO</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* --- CATEGORIES --- */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((cat, index) => (
              <TouchableOpacity
                key={index}
                style={styles.categoryPill}
                onPress={() => {
                  setCategory(cat.name);
                  handleSearch(cat.name);
                }}
              >
                <Ionicons name={cat.icon as any} size={16} color={THEME.white} />
                <Text style={styles.categoryText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* --- FEATURED SECTION --- */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleBar} />
              <Text style={styles.sectionTitle}>FEATURED PROFESSIONALS</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {filteredFeaturedVendors.length > 0 ? (
                filteredFeaturedVendors.map((vendor) => (
                  <TouchableOpacity
                    key={vendor.id}
                    style={styles.vendorCard}
                    onPress={() => setSelectedVendor(vendor)}
                  >
                    <View style={styles.vendorImageContainer}>
                      <View style={styles.featuredBadge}>
                        <Text style={styles.featuredText}>FEATURED</Text>
                      </View>
                      {vendor.logo ? (
                        <Image source={{ uri: vendor.logo }} style={styles.vendorImage} />
                      ) : (
                        <View style={[styles.vendorImage, { backgroundColor: THEME.navy, justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ color: 'rgba(255,255,255,0.1)', fontSize: 30, fontWeight: '900' }}>SLYZAH</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.vendorInfo}>
                      <Text style={styles.vendorName} numberOfLines={1}>{vendor.name || "Professional"}</Text>
                      <Text style={styles.vendorRegion}>{vendor.region || "Verified Pro"}</Text>
                      <View style={styles.vendorFooter}>
                        <Text style={styles.rating}>★ {vendor.rating || "5.0"}</Text>
                        <View style={styles.viewProfileBtn}>
                          <Text style={styles.viewProfileText}>VIEW DETAILS</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noFeaturedContainer}>
                  <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.noFeaturedText}>
                    No featured pros in {locationCity || locationProvince || "this area"} yet.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Vendor Detail Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!selectedVendor}
          onRequestClose={() => setSelectedVendor(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedVendor?.name}</Text>
                <TouchableOpacity onPress={() => setSelectedVendor(null)}>
                  <Ionicons name="close" size={24} color={THEME.navy} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                {selectedVendor?.logo && (
                  <Image source={{ uri: selectedVendor.logo }} style={styles.modalImage} resizeMode="cover" />
                )}

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalCategory}>{selectedVendor?.category || "Professional"}</Text>
                  <Text style={styles.modalRating}>★ {selectedVendor?.rating || "5.0"}</Text>
                </View>

                <Text style={styles.modalSectionTitle}>About</Text>
                <Text style={styles.modalDescription}>
                  {selectedVendor?.fullCategoryDescription || selectedVendor?.description || "No description available."}
                </Text>

                <Text style={styles.modalSectionTitle}>Location</Text>
                <Text style={styles.modalText}>
                  📍 {selectedVendor?.region || selectedVendor?.town || "Verified Area"}
                  {selectedVendor?.province ? `, ${selectedVendor.province}` : ''}
                </Text>

                <View style={styles.modalBadges}>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✅ VERIFIED PRO</Text>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedVendor(null)}>
                <Text style={styles.modalCloseButtonText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.navy,
  },
  heroContainer: {
    padding: 20,
    alignItems: 'center',
  },
  heroContent: {
    width: '100%',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.white,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.gold,
    letterSpacing: 2,
    marginBottom: 20,
  },
  searchBox: {
    backgroundColor: THEME.white,
    borderRadius: 25,
    width: '100%',
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray,
    paddingBottom: 10,
    marginBottom: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.navy,
  },
  searchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  locationButton: {
    padding: 5,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  findButton: {
    backgroundColor: THEME.navy,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  findButtonText: {
    color: THEME.white,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 8,
  },
  categoryText: {
    color: THEME.white,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  sectionTitleBar: {
    width: 4,
    height: 24,
    backgroundColor: THEME.gold,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.white,
    textTransform: 'uppercase',
  },
  vendorCard: {
    width: 220,
    backgroundColor: THEME.white,
    borderRadius: 20,
    marginRight: 15,
    overflow: 'hidden',
  },
  vendorImageContainer: {
    height: 120,
    backgroundColor: THEME.navy,
    position: 'relative',
  },
  vendorImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: THEME.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  featuredText: {
    fontSize: 8,
    fontWeight: '900',
    color: THEME.navy,
  },
  vendorInfo: {
    padding: 15,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.navy,
    marginBottom: 4,
  },
  vendorRegion: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  vendorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: THEME.gray,
    paddingTop: 10,
  },
  rating: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D97706', // Darker gold
  },
  viewProfileBtn: {
    backgroundColor: THEME.navy,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  viewProfileText: {
    color: THEME.white,
    fontSize: 8,
    fontWeight: '900',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 31, 63, 0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.navy,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 10,
  },
  modalImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: THEME.gray,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalCategory: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.gold,
    backgroundColor: THEME.navy,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    textTransform: 'uppercase',
  },
  modalRating: { fontSize: 14, fontWeight: '900', color: '#D97706' },
  modalSectionTitle: { fontSize: 12, fontWeight: '900', color: THEME.navy, marginBottom: 5, marginTop: 10, textTransform: 'uppercase' },
  modalDescription: { fontSize: 14, color: '#555', lineHeight: 20, fontStyle: 'italic' },
  modalText: { fontSize: 14, color: '#333', fontWeight: '600' },
  modalBadges: { flexDirection: 'row', gap: 10, marginTop: 20 },
  verifiedBadge: { backgroundColor: '#E6FFFA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#B2F5EA' },
  verifiedText: { fontSize: 10, fontWeight: '900', color: '#2C7A7B' },
  modalCloseButton: {
    backgroundColor: THEME.navy,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: { color: THEME.white, fontWeight: '900', fontSize: 12 },
  noFeaturedContainer: {
    width: width - 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  noFeaturedText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
