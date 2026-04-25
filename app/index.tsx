import { Ionicons } from '@expo/vector-icons';
import { useAssets } from 'expo-asset';
import { ResizeMode, Video } from 'expo-av';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDocs, limit, onSnapshot, query, orderBy } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Dimensions,
  Image,
  Linking,
  Modal,
  View,
  Animated,
  Easing
} from 'react-native';
import { Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
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

const CREDENTIAL_MAPPING: Record<string, { label: string; field: string }> = {
  "Plumber": { label: "PIRB Licensed", field: "pirbNumber" },
  "Electrician": { label: "Wireman's License", field: "wiremanNumber" },
  "Panel Beater": { label: "RMI Member", field: "rmiNumber" },
  "Builder": { label: "NHBRC Reg", field: "nhbrcNumber" },
  "Gas": { label: "SAQCC Gas", field: "saqccNumber" },
  "Air Conditioning": { label: "SARACCA", field: "saraccaNumber" },
  "CCTV & Security": { label: "PSiRA Reg", field: "psiraNumber" },
  "Pest Control": { label: "PCO Reg", field: "pcoNumber" },
  "Appliance Repairs": { label: "Trade Cert", field: "tradeCertNumber" },
  "Locksmith": { label: "LASA Member", field: "lasaNumber" },
  "Roofing": { label: "PRA Member", field: "praNumber" },
  "Gate Motors": { label: "Certified Installer", field: "installerNumber" },
  "Carpenter": { label: "Trade Cert", field: "tradeCertNumber" },
  "Solar": { label: "PV GreenCard", field: "pvGreenCardNumber" },
  "Fire Protection": { label: "SAQCC Fire", field: "fireRegNumber" },
  "Movers": { label: "PMA Member", field: "pmaNumber" },
  "Mechanic": { label: "MIWA/RMI Member", field: "miwaNumber" },
  "Auto Glass": { label: "SAGGA Member", field: "saggaNumber" },
  "Borehole": { label: "BWA Member", field: "bwaNumber" },
  "Cleaning": { label: "NCCA Member", field: "nccaNumber" },
  "Pool Services": { label: "NSPI Member", field: "nspiNumber" },
  "Tree Felling": { label: "Public Liability", field: "insuranceNumber" },
  "Solar / EV": { label: "PV GreenCard / EV Cert", field: "pvGreenCardNumber" },
  "Cybersecurity": { label: "IT Security Cert", field: "itSecurityCertNumber" },
  "Accountant": { label: "SAIPA / SARS No.", field: "saipaNumber" },
  "Childcare": { label: "First Aid / Background Check", field: "childcareCertNumber" }
};

const resolveCredentialMapping = (categoryInput: string) => {
  if (!categoryInput) return null;

  // 1. Exact Match
  if (CREDENTIAL_MAPPING[categoryInput]) return CREDENTIAL_MAPPING[categoryInput];

  // 2. Fuzzy / Keyword Match
  const normalized = categoryInput.toLowerCase();

  const keywords: Record<string, string> = {
    "plumb": "Plumber",
    "electr": "Electrician",
    "carpent": "Carpenter",
    "build": "Builder",
    "gas": "Gas",
    "air": "Air Conditioning",
    "condition": "Air Conditioning",
    "security": "CCTV & Security",
    "cctv": "CCTV & Security",
    "pest": "Pest Control",
    "appliance": "Appliance Repairs",
    "lock": "Locksmith",
    "roof": "Roofing",
    "gate": "Gate Motors",
    "solar": "Solar/Power",
    "power": "Solar/Power",
    "clean": "Cleaning",
    "auto": "Automotive",
    "mechanic": "Automotive",
    "panel": "Panel Beater",
    "beat": "Panel Beater",
    "handy": "Handyman",
    "ev": "Solar / EV",
    "cyber": "Cybersecurity",
    "account": "Accountant",
    "tax": "Accountant",
    "child": "Childcare",
    "baby": "Childcare",
    "nanny": "Childcare"
  };

  for (const [keyword, mapKey] of Object.entries(keywords)) {
    if (normalized.includes(keyword)) {
      return CREDENTIAL_MAPPING[mapKey];
    }
  }

  return null;
};

const CATEGORIES = [
  { name: "Plumber", icon: "water-outline" },
  { name: "Electrician", icon: "flash-outline" },
  { name: "Builder", icon: "hammer-outline" },
  { name: "Gas", icon: "flame-outline" },
  { name: "Solar/Power", icon: "sunny-outline" },
  { name: "Cleaning", icon: "sparkles-outline" },
  { name: "Handyman", icon: "construct-outline" },
  { name: "Pest Control", icon: "bug-outline" }
];

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

    // Check if location is set before searching
    if (!locationCity && !locationProvince) {
      Alert.alert(
        "Location Required",
        "Please tap 'Detect Location' first to find professionals near you.",
        [
          { text: "OK" }
        ]
      );
      return;
    }

    // Navigate to Results
    router.push({
      pathname: "/results",
      params: { cat: finalCat, region: locationCity, province: locationProvince }
    });
  };



  // Slyzah Pulse Activity Feed Logic
  const [pulseLeads, setPulseLeads] = useState<any[]>([]);
  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPulseLeads(leads);
    });
    return unsubscribe;
  }, []);

  const PulseTicker = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const fadeAnim = useState(new Animated.Value(1))[0];

    useEffect(() => {
      if (pulseLeads.length === 0) return;
      const interval = setInterval(() => {
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ]).start();

        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % pulseLeads.length);
        }, 500);
      }, 5000);
      return () => clearInterval(interval);
    }, [pulseLeads]);

    if (pulseLeads.length === 0) return null;
    const current = pulseLeads[currentIndex];

    return (
      <Animated.View style={[styles.pulseContainer, { opacity: fadeAnim }]}>
        <View style={styles.pulseDot} />
        <Text style={styles.pulseText}>
          Someone in <Text style={{ color: THEME.gold }}>{current.town || "South Africa"}</Text> just requested a <Text style={{ color: THEME.gold }}>{current.category}</Text>
        </Text>
      </Animated.View>
    );
  };

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
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 31, 63, 0.75)' }]} />

      <SafeAreaView style={{ flex: 1, zIndex: 1 }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          
          <PulseTicker />

          {/* --- HERO SECTION --- */}
          <View style={styles.heroContainer}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Smarter Service.{"\n"}Faster Quotes.</Text>
              <Text style={styles.heroSubtitle}>SOUTH AFRICA'S ELITE PRO NETWORK</Text>

              {/* Glassmorphism Search Box */}
              <View style={styles.glassSearchBox}>
                <View style={styles.searchInputRow}>
                  <Ionicons name="search" size={20} color={THEME.white} />
                  <TextInput
                    style={[styles.input, { color: THEME.white }]}
                    placeholder="What service do you need?"
                    placeholderTextColor="rgba(255,255,255,0.5)"
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
                    <Text style={[styles.locationText, (locationCity || locationProvince) ? { color: THEME.gold } : { color: 'rgba(255,255,255,0.6)' }]}>
                      {geoLoading ? "..." : (locationCity || locationProvince) ? `📍 ${locationCity || locationProvince}` : "📍 Detect Location"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.findButton}
                    onPress={() => handleSearch()}
                  >
                    <Text style={styles.findButtonText}>SEARCH</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* --- PREMIUM CATEGORY GRID --- */}
          <View style={styles.gridContainer}>
            <Text style={styles.gridTitle}>POPULAR SERVICES</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.slice(0, 6).map((cat: {name: string, icon: string}, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.gridItem}
                  onPress={() => {
                    setCategory(cat.name);
                    handleSearch(cat.name);
                  }}
                >
                  <View style={styles.gridIconContainer}>
                    <Ionicons name={cat.icon as any} size={28} color={THEME.gold} />
                  </View>
                  <Text style={styles.gridItemText}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* --- SERVICE GUARANTEES --- */}
          <View style={styles.guaranteeSection}>
             <View style={styles.guaranteeItem}>
                <Ionicons name="shield-checkmark" size={24} color={THEME.gold} />
                <Text style={styles.guaranteeText}>VERIFIED PROS</Text>
             </View>
             <View style={styles.guaranteeItem}>
                <Ionicons name="flash" size={24} color={THEME.gold} />
                <Text style={styles.guaranteeText}>RAPID QUOTES</Text>
             </View>
             <View style={styles.guaranteeItem}>
                <Ionicons name="star" size={24} color={THEME.gold} />
                <Text style={styles.guaranteeText}>ELITE QUALITY</Text>
             </View>
          </View>

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
                      <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 4, alignItems: 'center' }}>
                        <Text style={styles.vendorRegion}>{vendor.region || "Verified Pro"}</Text>
                        {vendor.rapidResponder && (
                          <Text style={{ fontSize: 8, fontWeight: '900', color: '#006064', backgroundColor: '#E0F7FA', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>⚡ 15m</Text>
                        )}
                      </View>
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

                {selectedVendor?.website && (
                  <>
                    <Text style={styles.modalSectionTitle}>Website</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(selectedVendor.website)}>
                      <Text style={[styles.modalText, { color: THEME.navy, textDecorationLine: 'underline' }]}>{selectedVendor.website}</Text>
                    </TouchableOpacity>
                  </>
                )}

                {(() => {
                  const mapping = selectedVendor ? resolveCredentialMapping(selectedVendor.category) : null;
                  if (selectedVendor && mapping && selectedVendor[mapping.field]) {
                    return (
                      <View style={{ marginTop: 15 }}>
                        <Text style={styles.modalSectionTitle}>Credentials</Text>
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedText}>🛡️ {mapping.label}: {selectedVendor[mapping.field]}</Text>
                        </View>
                      </View>
                    );
                  }
                  return null;
                })()}

                {selectedVendor?.additionalCertifications && Array.isArray(selectedVendor.additionalCertifications) && selectedVendor.additionalCertifications.length > 0 && (
                  <View style={{ marginTop: 15 }}>
                    <Text style={styles.modalSectionTitle}>Additional Certifications</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {selectedVendor.additionalCertifications.map((cert: any, index: number) => (
                        <View key={index} style={[styles.verifiedBadge, { backgroundColor: '#F3E5F5', borderColor: '#E1BEE7' }]}>
                          <Text style={[styles.verifiedText, { color: '#7B1FA2' }]}>📜 {cert.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.modalBadges}>
                  {selectedVendor?.rapidResponder && (
                    <View style={[styles.verifiedBadge, { backgroundColor: '#E0F7FA', borderColor: '#26C6DA' }]}>
                      <Text style={[styles.verifiedText, { color: '#006064' }]}>⚡ RAPID RESPONDER</Text>
                    </View>
                  )}
                  {selectedVendor?.cipcVerified && (
                    <View style={[styles.verifiedBadge, { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }]}>
                      <Text style={[styles.verifiedText, { color: '#1B5E20' }]}>✅ CIPC VERIFIED</Text>
                    </View>
                  )}
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
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.gold,
    marginRight: 8,
    shadowColor: THEME.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  pulseText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroContainer: {
    padding: 20,
    paddingTop: 30,
    alignItems: 'center',
  },
  heroContent: {
    width: '100%',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: THEME.white,
    textAlign: 'left',
    marginBottom: 8,
    lineHeight: 38,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.gold,
    letterSpacing: 2,
    marginBottom: 25,
    textAlign: 'left',
    opacity: 0.8,
  },
  glassSearchBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 15,
    marginBottom: 15,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: THEME.white,
  },
  searchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationButton: {
    flex: 1,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  findButton: {
    backgroundColor: THEME.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: THEME.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  findButtonText: {
    color: THEME.navy,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  gridContainer: {
    padding: 20,
    marginTop: 10,
  },
  gridTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 3,
    marginBottom: 20,
    textAlign: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (width - 64) / 3,
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridItemText: {
    color: THEME.white,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  guaranteeSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 25,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 15,
  },
  guaranteeItem: {
    alignItems: 'center',
    gap: 6,
  },
  guaranteeText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionContainer: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 12,
  },
  sectionTitleBar: {
    width: 4,
    height: 18,
    backgroundColor: THEME.gold,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.white,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  vendorCard: {
    width: 170,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 28,
    marginRight: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  vendorImageContainer: {
    height: 110,
    width: '100%',
    position: 'relative',
  },
  vendorImage: {
    width: '100%',
    height: '100%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: THEME.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 2,
  },
  featuredText: {
    fontSize: 7,
    fontWeight: '900',
    color: THEME.navy,
  },
  vendorInfo: {
    padding: 12,
  },
  vendorName: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.white,
    marginBottom: 4,
  },
  vendorRegion: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  vendorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  rating: {
    color: THEME.gold,
    fontSize: 10,
    fontWeight: '900',
  },
  viewProfileBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewProfileText: {
    color: THEME.white,
    fontSize: 7,
    fontWeight: '900',
  },
  noFeaturedContainer: {
    width: width - 40,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  noFeaturedText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 31, 63, 0.95)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 25,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.navy,
    flex: 1,
    marginRight: 15,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 24,
    marginBottom: 15,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalCategory: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.gold,
    backgroundColor: THEME.navy,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalRating: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.navy,
  },
  modalSectionTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 15,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4B5563',
    fontWeight: '500',
  },
  modalText: {
    fontSize: 13,
    color: THEME.navy,
    fontWeight: '700',
  },
  modalBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 15,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.navy,
  },
  modalCloseButton: {
    backgroundColor: THEME.navy,
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseButtonText: {
    color: THEME.white,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 2,
  },
});
