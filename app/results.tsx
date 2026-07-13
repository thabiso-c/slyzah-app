import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { GooglePlaceData, GooglePlaceDetail, GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, storage } from '../firebaseConfig';
import { GOOGLE_MAPS_API_KEY } from '../lib/secrets';
import { sendPushNotification, WEB_API_BASE_URL } from '../lib/api_client';
import { sendResendEmail } from '../lib/services';

const { width, height } = Dimensions.get('window');

const THEME = {
    navy: '#000046',
    gold: '#D5AD36',
    navy800: '#000046',
    gold400: '#D5AD36',
    surface: '#1A1A2E',
    white: '#FFFFFF',
    gray: '#F3F4F6',
    placeholder: '#9CA3AF',
    text: '#000046'
};

const CREDENTIAL_MAPPING: Record<string, { label: string; field: string; docField: string }> = {
    "Plumber": { label: "PIRB Licensed", field: "pirbNumber", docField: "pirbDocumentUrl" },
    "Electrician": { label: "Wireman's License", field: "wiremanNumber", docField: "wiremanDocumentUrl" },
    "Panel Beater": { label: "RMI Member", field: "rmiNumber", docField: "rmiDocumentUrl" },
    "Builder": { label: "NHBRC Reg", field: "nhbrcNumber", docField: "nhbrcDocumentUrl" },
    "Gas": { label: "SAQCC Gas", field: "saqccNumber", docField: "saqccDocumentUrl" },
    "Air Conditioning": { label: "SARACCA", field: "saraccaNumber", docField: "saraccaDocumentUrl" },
    "CCTV & Security": { label: "PSiRA Reg", field: "psiraNumber", docField: "psiraDocumentUrl" },
    "Pest Control": { label: "PCO Reg", field: "pcoNumber", docField: "pcoDocumentUrl" },
    "Appliance Repairs": { label: "Trade Cert", field: "tradeCertNumber", docField: "tradeCertDocumentUrl" },
    "Locksmith": { label: "LASA Member", field: "lasaNumber", docField: "lasaDocumentUrl" },
    "Roofing": { label: "PRA Member", field: "praNumber", docField: "praDocumentUrl" },
    "Gate Motors": { label: "Certified Installer", field: "installerNumber", docField: "installerDocumentUrl" },
    "Handyman": { label: "Liability Insurance", field: "liabilityPolicyNumber", docField: "liabilityPolicyUrl" },
    "Solar/Power": { label: "PV Green Card", field: "pvGreenCardNumber", docField: "pvGreenCardUrl" },
    "Cleaning": { label: "NCCA Member", field: "nccaNumber", docField: "nccaUrl" },
    "Automotive": { label: "RMI / MIWA", field: "rmiMiwaNumber", docField: "rmiMiwaUrl" },
    "Carpenter": { label: "Trade Cert", field: "tradeCertNumber", docField: "tradeCertDocumentUrl" },
    "Solar": { label: "PV GreenCard", field: "pvGreenCardNumber", docField: "pvGreenCardUrl" },
    "Fire Protection": { label: "SAQCC Fire", field: "fireRegNumber", docField: "fireRegUrl" },
    "Movers": { label: "PMA Member", field: "pmaNumber", docField: "pmaUrl" },
    "Mechanic": { label: "MIWA/RMI Member", field: "miwaNumber", docField: "miwaUrl" },
    "Auto Glass": { label: "SAGGA Member", field: "saggaNumber", docField: "saggaUrl" },
    "Borehole": { label: "BWA Member", field: "bwaNumber", docField: "bwaUrl" },
    "Pool Services": { label: "NSPI Member", field: "nspiNumber", docField: "nspiUrl" },
    "Tree Felling": { label: "Public Liability", field: "insuranceNumber", docField: "insuranceUrl" },
    "Solar / EV": { label: "PV GreenCard / EV Cert", field: "pvGreenCardNumber", docField: "pvGreenCardUrl" },
    "Cybersecurity": { label: "IT Security Cert", field: "itSecurityCertNumber", docField: "itSecurityCertUrl" },
    "Accountant": { label: "SAIPA / SARS No.", field: "saipaNumber", docField: "saipaUrl" },
    "Childcare": { label: "First Aid / Background Check", field: "childcareCertNumber", docField: "childcareCertUrl" }
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

// --- Request Quote Modal Component ---
const RequestQuoteModal = ({ visible, onClose, category, selectedVendorIds, initialData, availableVendors }: any) => {
    const [formData, setFormData] = useState(initialData);
    const [submitting, setSubmitting] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [urgency, setUrgency] = useState<'urgent' | 'standard' | 'comparing'>('standard');
    const router = useRouter();

    if (!GOOGLE_MAPS_API_KEY) {
        console.error("CRITICAL: GOOGLE_MAPS_API_KEY is missing in lib/secrets.ts");
    }

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        // Strict Server-Side Style Validation on Mobile
        const { name, phone, issue, address, town } = formData;
        const cleanName = name?.trim();
        const cleanPhone = phone?.trim();

        if (!cleanName || !cleanPhone || !issue?.trim() || !address?.trim()) {
            Alert.alert("Input Error", "Please verify all required fields are filled correctly.");
            return;
        }

        setSubmitting(true);
        try {
            const user = auth.currentUser;

            let imageUrl = "";
            if (imageUri) {
                const response = await fetch(imageUri);
                const blob = await response.blob();
                const uid = user?.uid || "guest";
                const storageRef = ref(storage, `leads/${uid}/${Date.now()}_image.jpg`);
                const snapshot = await uploadBytes(storageRef, blob);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            // Split vendors into registered (Firestore) and web (scraped)
            const registeredVendorIds = selectedVendorIds.filter(
                (id: string) => !availableVendors?.find((v: any) => v.id === id && v.source === "web")
            );
            const webVendorsSelected = (availableVendors || []).filter(
                (v: any) => v.source === "web" && selectedVendorIds.includes(v.id)
            );

            console.log("Creating lead document...");
            const docRef = await addDoc(collection(db, "leads"), {
                customerId: user?.uid || "guest",
                customerName: formData.name,
                customerPhone: formData.phone,
                customerEmail: formData.email,
                category: category,
                issueDescription: formData.issue,
                address: formData.address,
                imageUrl: imageUrl,
                urgency: urgency,
                town: formData.town,
                vendorIds: registeredVendorIds,
                webVendorIds: webVendorsSelected.map((v: any) => v.id),
                status: "open",
                createdAt: serverTimestamp(),
                platform: "mobile",
                quotes: {},
                legal: {
                    termsAgreed: true,
                    privacyPolicyAccepted: true,
                    consentTimestamp: new Date().toISOString(),
                    processingPurpose: "Lead generation and vendor connection",
                    platformRole: "Intermediary / Marketplace Provider"
                }
            });
            console.log("Lead created successfully with ID:", docRef.id);

            // ── 1. Process Registered (Firestore) Vendors ────────────────────────
            if (registeredVendorIds.length > 0) {
                for (const vendorId of registeredVendorIds) {
                    try {
                        let vendorData = availableVendors?.find((v: any) => v.id === vendorId);
                        if (!vendorData) {
                            const vendorSnap = await getDoc(doc(db, "professionals", vendorId));
                            if (vendorSnap.exists()) vendorData = vendorSnap.data();
                        }
                        if (!vendorData) { console.warn(`Vendor data not found: ${vendorId}`); continue; }

                        if (vendorData?.email) {
                            await sendResendEmail(
                                vendorData.email,
                                vendorData.name || "Professional",
                                formData.name,
                                category,
                                formData.issue,
                                formData.address,
                                formData.town,
                                docRef.id,
                                vendorId,
                                imageUrl,
                                urgency,
                                "thabilet@slyza.co.za"
                            );
                        }
                        await addDoc(collection(db, "professionals", vendorId, "notifications"), {
                            type: "lead",
                            notificationMessage: `New Request: ${formData.issue} in ${formData.town}`,
                            status: "unread",
                            createdAt: serverTimestamp(),
                            leadId: docRef.id
                        });
                        if (vendorData.expoPushToken) {
                            await sendPushNotification(vendorData.expoPushToken, `New Lead: ${category}`, formData.issue, { leadId: docRef.id, urgency });
                        }
                    } catch (e) {
                        console.error("Error notifying registered vendor:", vendorId, e);
                    }
                }
            }

            // ── 2. Process Web (Scraped) Vendors via Deployed Web API ─────────────
            if (webVendorsSelected.length > 0) {
                try {
                    await fetch(`${WEB_API_BASE_URL}/api/send-outreach-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            customerName: formData.name,
                            customerPhone: formData.phone,
                            customerEmail: formData.email,
                            category,
                            issue: formData.issue,
                            address: formData.address,
                            town: formData.town,
                            imageUrls: imageUrl ? [imageUrl] : [],
                            urgency,
                            customerId: user?.uid,
                            externalVendors: webVendorsSelected,
                            leadId: docRef.id,
                            platform: "mobile",
                            legal: {
                                termsAgreed: true,
                                privacyPolicyAccepted: true,
                                consentTimestamp: new Date().toISOString()
                            }
                        })
                    });
                    console.log(`Web vendor outreach sent for ${webVendorsSelected.length} vendors`);
                } catch (e) {
                    console.error("Error sending outreach for web vendors:", e);
                }
            }

            Alert.alert("Success", "Your quote request has been sent! You will be redirected to your dashboard to view replies.", [
                {
                    text: "OK", onPress: () => {
                        onClose();
                        router.replace('/dashboard');
                    }
                }
            ]);
        } catch (error) {
            console.error("Error sending quote:", error);
            Alert.alert("Error", "Could not send request. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Request Quotes</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={THEME.navy} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="always">
                        <Text style={styles.label}>Your Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(t) => setFormData({ ...formData, name: t })}
                            placeholder="John Doe"
                            placeholderTextColor={THEME.placeholder}
                        />

                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.phone}
                            onChangeText={(t) => setFormData({ ...formData, phone: t })}
                            placeholder="082 123 4567"
                            keyboardType="phone-pad"
                            placeholderTextColor={THEME.placeholder}
                        />
                        <Text style={styles.label}>Email (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(t) => setFormData({ ...formData, email: t })}
                            placeholder="john@example.com"
                            keyboardType="email-address"
                            placeholderTextColor={THEME.placeholder}
                        />
                        <Text style={styles.label}>Describe your issue</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            value={formData.issue}
                            onChangeText={(t) => setFormData({ ...formData, issue: t })}
                            placeholder="I need help with..."
                            placeholderTextColor={THEME.placeholder}
                            multiline
                        />
                        <Text style={styles.label}>How urgently do you need this service?</Text>
                        <View style={styles.urgencyContainer}>
                            <TouchableOpacity
                                style={[styles.urgencyButton, urgency === 'urgent' && styles.urgencyButtonActive]}
                                onPress={() => setUrgency('urgent')}>
                                <Text style={[styles.urgencyButtonText, urgency === 'urgent' && styles.urgencyButtonTextActive]}>Need service urgently</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.urgencyButton, urgency === 'standard' && styles.urgencyButtonActive]}
                                onPress={() => setUrgency('standard')}>
                                <Text style={[styles.urgencyButtonText, urgency === 'standard' && styles.urgencyButtonTextActive]}>Service not needed urgently</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.urgencyButton, urgency === 'comparing' && styles.urgencyButtonActive]}
                                onPress={() => setUrgency('comparing')}>
                                <Text style={[styles.urgencyButtonText, urgency === 'comparing' && styles.urgencyButtonTextActive]}>Just comparing quotes</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Address / Area</Text>
                        <View style={{ zIndex: 5000, elevation: 5000 }}>
                            <GooglePlacesAutocomplete
                                placeholder='Search Address'
                                onPress={(data: GooglePlaceData, details: GooglePlaceDetail | null = null) => {
                                    const address = data.description;
                                    let town = "";
                                    if (details?.address_components) {
                                        let locality = "";
                                        let subLocality = "";
                                        let neighborhood = "";

                                        details.address_components.forEach((component: any) => {
                                            if (component.types.includes("locality")) locality = component.long_name;
                                            if (component.types.includes("sublocality") || component.types.includes("sublocality_level_1") || component.types.includes("sublocality_level_2")) subLocality = component.long_name;
                                            if (component.types.includes("neighborhood")) neighborhood = component.long_name;
                                        });
                                        // Prioritize specific suburb names (Neighborhood > Suburb > City)
                                        town = neighborhood || subLocality || locality;
                                    }
                                    setFormData({ ...formData, address, town: town || formData.town });
                                }}
                                query={{
                                    key: GOOGLE_MAPS_API_KEY,
                                    language: 'en',
                                    components: 'country:za',
                                }}
                                fetchDetails={true}
                                fields={'address_components,geometry,formatted_address'}
                                onFail={(error) => {
                                    console.error("Google Maps Error:", error);
                                }}
                                styles={{
                                    textInput: styles.input,
                                    listView: { position: 'absolute', top: 50, width: '100%', backgroundColor: 'white', borderRadius: 10, elevation: 11, zIndex: 11 },
                                }}
                                enablePoweredByContainer={false}
                                textInputProps={{ placeholderTextColor: THEME.placeholder, returnKeyType: "search" }}
                            />
                        </View>

                        <Text style={styles.label}>Town / City</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.town}
                            onChangeText={(t) => setFormData({ ...formData, town: t })}
                            placeholder="City"
                            placeholderTextColor={THEME.placeholder}
                        />

                        <Text style={styles.label}>Attach Image (Optional)</Text>
                        <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <Ionicons name="camera" size={24} color={THEME.placeholder} />
                                    <Text style={styles.uploadText}>Tap to select image</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {imageUri && (
                            <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeButton}>
                                <Text style={styles.removeButtonText}>Remove Image</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color={THEME.navy} />
                            ) : (
                                <Text style={styles.submitButtonText}>SEND REQUEST</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// --- Main Results Screen ---
export default function ResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    // Handle params safely
    const rawCategory = Array.isArray(params.cat) ? params.cat[0] : params.cat || "";
    const category = rawCategory.trim();
    const userRegion = Array.isArray(params.region) ? params.region[0] : params.region || "";
    const userProvince = Array.isArray(params.province) ? params.province[0] : params.province || "";
    const userSuburb = Array.isArray(params.suburb) ? params.suburb[0] : params.suburb || "";

    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(8);
    const [searchStatus, setSearchStatus] = useState<"local" | "global" | "none">("local");
    const [selectedForQuote, setSelectedForQuote] = useState<string[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({ name: "", phone: "", email: "", details: "", address: "" });
    const [viewingCredentials, setViewingCredentials] = useState<any>(null);
    const [viewingGallery, setViewingGallery] = useState<{ images: string[], index: number } | null>(null);
    const [failedImageUrls, setFailedImageUrls] = useState<Record<string, true>>({});


    const [selectedVendorForReviews, setSelectedVendorForReviews] = useState<any>(null);
    const [vendorReviews, setVendorReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [reviewSort, setReviewSort] = useState<'recent' | 'rating'>('recent');

    const getSafeImageUrl = (url?: string | null) => {
        const trimmed = String(url || "").trim();
        if (!trimmed || failedImageUrls[trimmed]) return "";
        return /^https?:\/\//i.test(trimmed) || trimmed.startsWith("file://") ? trimmed : "";
    };

    const markImageFailed = (url: string) => {
        setFailedImageUrls(prev => ({ ...prev, [url]: true }));
    };

    const openDocumentUrl = async (url?: string | null) => {
        const safeUrl = getSafeImageUrl(url);
        if (safeUrl) await WebBrowser.openBrowserAsync(safeUrl);
    };

    const formatVendorLocation = (vendor: any) => {
        if (vendor?.tier === "Multi-Province") return "National Coverage";
        const locationParts = [vendor?.region || vendor?.town, vendor?.province].filter(Boolean);
        return locationParts.length > 0 ? locationParts.join(" | ") : "Coverage area pending";
    };

    const getVendorCredentialDetails = (vendor: any) => {
        const mapping = resolveCredentialMapping(vendor?.category || category);
        const additionalCerts = Array.isArray(vendor?.additionalCertifications)
            ? vendor.additionalCertifications
                .map((cert: any) => typeof cert === "string" ? { name: cert } : cert)
                .filter((cert: any) => cert?.name)
            : [];

        return {
            mapping,
            serviceNumber: mapping ? vendor?.[mapping.field] : "",
            serviceDocUrl: mapping ? vendor?.[mapping.docField] : "",
            additionalCerts
        };
    };

    // Auto-fill user data
    useEffect(() => {
        const fetchUserData = async () => {
            if (auth.currentUser) {
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setFormData(prev => ({
                        ...prev,
                        name: data.firstName && data.surname ? `${data.firstName} ${data.surname}` : (auth.currentUser?.displayName || prev.name),
                        phone: data.phoneNumber || prev.phone,
                        email: auth.currentUser?.email || prev.email
                    }));
                }
            }
        };
        fetchUserData();
    }, []);

    // Fetch Reviews
    const fetchReviews = async (vendor: any) => {
        setSelectedVendorForReviews(vendor);
        if (vendor.source === "web") {
            const webReviews = (vendor.reviews || []).map((rev: any, idx: number) => ({
                id: `${vendor.id}-review-${idx}`,
                customerName: rev.authorName || "Google Reviewer",
                rating: rev.rating,
                comment: rev.comment,
                timeDescription: rev.timeDescription,
                createdAt: rev.time ? { seconds: rev.time, toDate: () => new Date(rev.time * 1000) } : null,
            }));
            setVendorReviews(webReviews);
            setLoadingReviews(false);
            return;
        }
        setLoadingReviews(true);
        try {
            const q = query(
                collection(db, "reviews"),
                where("vendorId", "==", vendor.id),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const reviewsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setVendorReviews(reviewsData);
        } catch (error) {
            console.error("Error fetching reviews:", error);
        } finally {
            setLoadingReviews(false);
        }
    };

    // Fetch Professionals Logic (Ported from Web)
    useEffect(() => {
        const fetchProfessionals = async () => {
            if (!category) return;
            setLoading(true);
            console.log(`🔍 Searching for: "${category}" in Region: "${userRegion}", Province: "${userProvince}"`);

            try {
                const searchKeywords = category.toLowerCase().split(" ").map(word =>
                    word.replace(/(ing|er|ers|s)$/, "").trim()
                ).filter(word => word.length > 2);

                // This is much more efficient and secure than fetching all and filtering on the client.
                // This will require creating composite indexes in Firestore.
                const professionalsRef = collection(db, "professionals");
                let q;

                const clean = (str: any) => String(str || "").toLowerCase().trim();
                const uReg = clean(userRegion);
                const uProv = clean(userProvince);

                // Build a query based on available location data and keywords.
                // Note: Firestore's `array-contains-any` is limited to 10 values.
                const queryKeywords = searchKeywords.slice(0, 10);

                // Try querying by standard category field first (extremely scalable & direct for registered vendors), with fallback options.
                let matchedVendors: any[] = [];
                try {
                    const qCategory = query(professionalsRef, where("category", "==", category), limit(150));
                    const snapCategory = await getDocs(qCategory);
                    matchedVendors = snapCategory.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                } catch (catErr) {
                    console.warn("Failed to query by category directly, falling back...", catErr);
                }

                // Fallback 1: Query by keywords if category direct match yields nothing
                if (matchedVendors.length === 0 && queryKeywords.length > 0) {
                    try {
                        const qKeywords = query(professionalsRef, where("keywords", "array-contains-any", queryKeywords), limit(100));
                        const snapKeywords = await getDocs(qKeywords);
                        matchedVendors = snapKeywords.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    } catch (keyErr) {
                        console.warn("Failed to query by keywords, falling back...", keyErr);
                    }
                }

                // Fallback 2: Retrieve a list of vendors and filter in-memory if still empty (ensures zero silent search failures)
                if (matchedVendors.length === 0) {
                    try {
                        const qAll = query(professionalsRef, limit(150));
                        const snapAll = await getDocs(qAll);
                        matchedVendors = snapAll.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    } catch (allErr) {
                        console.error("Failed to fetch fallback vendors:", allErr);
                    }
                }

                // Filter in-memory by category or keyword substring to ensure absolute sync with search intent
                matchedVendors = matchedVendors.filter(v => {
                    const vCat = String(v.category || "").toLowerCase();
                    const vDesc = String(v.description || "").toLowerCase();
                    const vName = String(v.name || "").toLowerCase();
                    const searchLower = category.toLowerCase();
                    return vCat.includes(searchLower) || vDesc.includes(searchLower) || vName.includes(searchLower);
                });

                const processAndSort = (vendorList: any[]) => {
                    const clean = (str: any) => String(str || "").toLowerCase().trim();
                    const uReg = clean(userRegion);
                    const uProv = clean(userProvince);
                    const paidTiers = ["One Region", "Three Regions", "Provincial", "Multi-Province"];

                    const getScore = (v: any) => {
                        let score = 0;
                        const vTier = v.tier || "Basic";
                        const isPaid = paidTiers.includes(vTier);

                        // 1. Tier Priority (Huge weight to ensure Paid > Basic)
                        if (isPaid) score += 1000;

                        // 2. Location Priority
                        const vRegions = Array.isArray(v.regions) ? v.regions.map(clean) : [];
                        const vProvs = Array.isArray(v.provinces) ? v.provinces.map(clean) : [];
                        const vReg = clean(v.region);
                        const vProv = clean(v.province);

                        const regionMatch = (uReg && (vReg === uReg || vRegions.includes(uReg)));
                        const provinceMatch = (uProv && (vProv === uProv || vProvs.includes(uProv)));
                        const isNational = clean(vTier) === "multi-province";

                        if (regionMatch) score += 100;
                        else if (provinceMatch) score += 50;
                        else if (isNational) score += 25;

                        // 3. Rapid Responder Boost (Anti-Ghosting Guarantee)
                        if (v.rapidResponder) score += 500;

                        // 3. Rating Tie-Breaker
                        if (!isPaid) score += (v.rating || 0);

                        return score;
                    };

                    return vendorList
                        .map(v => ({ v, score: getScore(v), rand: Math.random() }))
                        .sort((a, b) => {
                            if (a.score !== b.score) return b.score - a.score;
                            return a.rand - b.rand; // Shuffle ties for fair rotation
                        })
                        .map(item => item.v);
                };

                // 2. Geo-Location Filtering & Prioritization

                // A. Exact Region Matches (Priority)
                const regionMatches = matchedVendors.filter(v => {
                    const vReg = clean(v.region);
                    const vRegions = Array.isArray(v.regions) ? v.regions.map(clean) : [];
                    return (uReg && (vReg === uReg || vRegions.includes(uReg)));
                });

                // B. Nearby/Province Matches (Fallback)
                const provinceMatches = matchedVendors.filter(v => {
                    const vProv = clean(v.province);
                    const vProvs = Array.isArray(v.provinces) ? v.provinces.map(clean) : [];
                    return (uProv && (vProv === uProv || vProvs.includes(uProv)));
                });

                let finalSet: any[] = [];
                let status: "local" | "global" | "none" = "none";

                if (regionMatches.length > 0) {
                    finalSet = regionMatches;
                    status = "local";
                } else if (provinceMatches.length > 0) {
                    // Fallback to nearby regions (Province level) if no exact region matches
                    finalSet = provinceMatches;
                    status = "global";
                }

                // Fetch Web Vendors
                let webVendors: any[] = [];
                try {
                    // Build location: prefer mapped region/province, fall back to raw suburb from Nominatim.
                    // This mirrors slyzah-web behaviour where [userRegion, userProvince] is joined.
                    const location = [uReg, uProv].filter(Boolean).join(", ") || userSuburb;
                    const queryString = `category=${encodeURIComponent(category || "")}&location=${encodeURIComponent(location || "")}`;

                    const apiUrl = `${WEB_API_BASE_URL}/api/search-web-vendors?${queryString}`;
                    const res = await fetch(apiUrl);

                    if (res.ok) {
                        const data = await res.json();
                        if (data.vendors) {
                            webVendors = data.vendors.sort((a: any, b: any) => (b.rating ?? -1) - (a.rating ?? -1));
                        }
                    } else {
                        const errText = await res.text();
                        console.error("Web vendor API error:", res.status, errText);
                        Alert.alert("Web API Error", `Status: ${res.status}\nResponse: ${errText.substring(0, 100)}`);
                    }
                } catch (webErr: any) {
                    console.error("Web vendor fetch error:", webErr?.message || String(webErr));
                    Alert.alert("Web API Crash", `Error: ${webErr?.message || String(webErr)}`);
                }

                if (finalSet.length > 0 || webVendors.length > 0) {
                    const processedDB = processAndSort(finalSet);
                    setVendors([...processedDB, ...webVendors]);
                    setSearchStatus(finalSet.length > 0 ? status : "global");
                } else {
                    setVendors([]);
                    setSearchStatus("none");
                }
            } catch (error) {
                console.error("Search Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfessionals();
    }, [category, userRegion, userProvince]);

    const toggleSelection = (id: string) => {
        setSelectedForQuote(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 4 ? [...prev, id] : prev
        );
    };

    const handleRequestQuotes = () => {
        const hasWebVendor = selectedForQuote.some(id => vendors.find((v: any) => v.id === id)?.source === "web");
        if (!auth.currentUser && !hasWebVendor) {
            Alert.alert(
                "Login Required",
                "Please login to request quotes.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Login", onPress: () => router.push('/login') }
                ]
            );
        } else {
            setIsFormOpen(true);
        }
    };

    const renderVendor = ({ item }: { item: any }) => {
        const isWebVendor = item.source === "web";
        const isSponsored = !isWebVendor && ["One Region", "Three Regions", "Provincial", "Multi-Province"].includes(item.tier);
        const isSelected = selectedForQuote.includes(item.id);
        const credentialInfo = resolveCredentialMapping(item.category);
        const additionalCerts = Array.isArray(item.additionalCertifications) ? item.additionalCertifications : [];
        const logoUrl = getSafeImageUrl(item.logo);
        const galleryUrls = Array.isArray(item.serviceGallery)
            ? item.serviceGallery.map((imgUrl: string) => getSafeImageUrl(imgUrl)).filter(Boolean)
            : [];
        const credentials = getVendorCredentialDetails(item);
        const cipcDocumentUrl = getSafeImageUrl(item.cipcDocumentUrl);
        const serviceDocumentUrl = getSafeImageUrl(credentials.serviceDocUrl);

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => toggleSelection(item.id)}
                style={[
                    styles.card,
                    isSelected && styles.cardSelected
                ]}
            >
                {isSponsored && (
                    <View style={styles.sponsoredBadge}>
                        <Text style={styles.sponsoredText}>✨ SPONSORED</Text>
                    </View>
                )}
                {isWebVendor && (
                    <View style={[styles.sponsoredBadge, { backgroundColor: '#E8F0FE', borderColor: '#4285F4' }]}>
                        <Text style={[styles.sponsoredText, { color: '#1A73E8' }]}>🌐 FOUND ONLINE</Text>
                    </View>
                )}

                <View style={styles.cardHeader}>
                    {/* Checkbox */}
                    <View style={styles.checkboxContainer}>
                        <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={24}
                            color={THEME.gold}
                        />
                    </View>

                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        {logoUrl ? (
                            <Image source={{ uri: logoUrl }} style={styles.logo} onError={() => markImageFailed(logoUrl)} />
                        ) : (
                            <View style={styles.logoPlaceholder}>
                                <Text style={styles.logoPlaceholderText}>SLYZAH</Text>
                            </View>
                        )}
                    </View>

                    {/* Info */}
                    <View style={styles.infoContainer}>
                        <View style={styles.nameRow}>
                            <Text style={styles.vendorName} numberOfLines={1}>{item.name}</Text>
                            {!isSponsored && (
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingText}>★ {item.rating || "5.0"}</Text>
                                </View>
                            )}
                        </View>

                        {credentialInfo && item[credentialInfo.field] && (
                            <View style={styles.credentialBadge}>
                                <Text style={styles.credentialText}>🛡️ {credentialInfo.label}: {item[credentialInfo.field]}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <Text style={styles.description} numberOfLines={2}>
                    {`"${item.fullCategoryDescription || "Professional service provider available for call-outs."}"`}
                </Text>

                {!isWebVendor ? (
                    <View style={styles.credentialsPanel}>
                        <Text style={styles.credentialsTitle}>Credentials</Text>
                        <View style={styles.credentialsWrap}>
                            {!item.isIndependentContractor && item.cipcRegistrationNumber ? (
                                <TouchableOpacity
                                    disabled={!cipcDocumentUrl}
                                    onPress={() => openDocumentUrl(cipcDocumentUrl)}
                                    style={[styles.verifiedBadge, styles.credentialProofBadge, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}
                                >
                                    <Text style={[styles.verifiedText, { color: '#1B5E20' }]}>CIPC: {item.cipcRegistrationNumber}{cipcDocumentUrl ? " | VIEW" : ""}</Text>
                                </TouchableOpacity>
                            ) : null}
                            {credentials.mapping && credentials.serviceNumber ? (
                                <TouchableOpacity
                                    disabled={!serviceDocumentUrl}
                                    onPress={() => openDocumentUrl(serviceDocumentUrl)}
                                    style={[styles.verifiedBadge, styles.credentialProofBadge, { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' }]}
                                >
                                    <Text style={[styles.verifiedText, { color: '#1565C0' }]}>{credentials.mapping.label}: {credentials.serviceNumber}{serviceDocumentUrl ? " | VIEW" : ""}</Text>
                                </TouchableOpacity>
                            ) : null}
                            {credentials.additionalCerts.map((cert: any, index: number) => {
                                const certUrl = getSafeImageUrl(cert.url);
                                return (
                                    <TouchableOpacity
                                        key={`visible-cert-${index}`}
                                        disabled={!certUrl}
                                        onPress={() => openDocumentUrl(certUrl)}
                                        style={[styles.verifiedBadge, styles.credentialProofBadge, { backgroundColor: '#F3E5F5', borderColor: '#E1BEE7' }]}
                                    >
                                        <Text style={[styles.verifiedText, { color: '#7B1FA2' }]}>{cert.name}{certUrl ? " | VIEW" : ""}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                            {item.isIndependentContractor ? (
                                <View style={[styles.verifiedBadge, { backgroundColor: '#F3E5F5', borderColor: '#E1BEE7' }]}>
                                    <Text style={[styles.verifiedText, { color: '#7B1FA2' }]}>INDEPENDENT CONTRACTOR</Text>
                                </View>
                            ) : null}
                            {!item.isIndependentContractor && !item.cipcRegistrationNumber && !credentials.serviceNumber && credentials.additionalCerts.length === 0 ? (
                                <Text style={styles.noCredentialText}>Verification details pending review.</Text>
                            ) : null}
                        </View>
                    </View>
                ) : (
                    <View style={[styles.credentialsPanel, { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[styles.credentialsTitle, { color: '#1565C0' }]}>Sourced Online</Text>
                        </View>
                        <Text style={[styles.noCredentialText, { color: '#1976D2' }]}>
                            🌐 Found online{item.emailFound ? " — email on file for quote outreach" : " — we'll share your details when you request a quote"}.
                        </Text>
                    </View>
                    <View style={[styles.credentialsPanel, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7', padding: 12, marginTop: 8 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={[styles.credentialsTitle, { color: '#B45309', fontSize: 10 }]}>Is this your business?</Text>
                            <TouchableOpacity 
                                onPress={() => router.push('/register')}
                                style={{ backgroundColor: THEME.navy, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                            >
                                <Text style={{ color: THEME.white, fontSize: 8, fontWeight: '900' }}>CLAIM PROFILE</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.noCredentialText, { color: '#D97706', fontSize: 9, lineHeight: 13 }]}>
                            Register to claim your profile, import your reviews, and gain priority results positions!
                        </Text>
                    </View>
                    <View style={{ display: 'none' }}>
                        <View>
                            <Text style={[styles.noCredentialText, { color: '#42A5F5', fontSize: 8 }]}>VERIFIED BY GOOGLE</Text>
                        </View>
                        <Text style={[styles.noCredentialText, { color: '#1976D2' }]}>
                            🌐 Found online{item.emailFound ? " — email on file for quote outreach" : " — we'll share your details when you request a quote"}.
                        </Text>
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <View style={{ flexDirection: 'row', gap: 15 }}>
                        <TouchableOpacity onPress={() => fetchReviews(item)}>
                            <Text style={styles.reviewsLink}>REVIEWS</Text>
                        </TouchableOpacity>
                        {!isWebVendor && (
                            <TouchableOpacity onPress={() => setViewingCredentials(item)}>
                                <Text style={[styles.reviewsLink, { color: THEME.gold }]}>PROOFS</Text>
                            </TouchableOpacity>
                        )}
                        {isWebVendor && item.phone && (
                            <TouchableOpacity onPress={async () => await Linking.openURL(`tel:${item.phone}`)}>
                                <Text style={styles.reviewsLink}>CALL</Text>
                            </TouchableOpacity>
                        )}
                        {item.website && (
                            <TouchableOpacity onPress={async () => await WebBrowser.openBrowserAsync(item.website)}>
                                <Text style={styles.reviewsLink}>WEBSITE</Text>
                            </TouchableOpacity>
                        )}
                        {isWebVendor && item.mapsUrl && (
                            <TouchableOpacity onPress={async () => await WebBrowser.openBrowserAsync(item.mapsUrl)}>
                                <Text style={styles.reviewsLink}>MAPS</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                        {item.rapidResponder && (
                            <View style={[styles.verifiedBadge, { backgroundColor: '#E0F7FA', borderColor: '#80DEEA' }]}>
                                <Text style={[styles.verifiedText, { color: '#006064' }]}>⚡ 15m RESPONSE</Text>
                            </View>
                        )}
                        {item.cipcVerified && !item.isIndependentContractor && (
                            <View style={[styles.verifiedBadge, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
                                <Text style={[styles.verifiedText, { color: '#1B5E20' }]}>✅ CIPC VERIFIED</Text>
                            </View>
                        )}
                        {item.isIndependentContractor && (
                            <View style={[styles.verifiedBadge, { backgroundColor: '#F3E5F5', borderColor: '#E1BEE7' }]}>
                                <Text style={[styles.verifiedText, { color: '#7B1FA2' }]}>👤 INDEPENDENT</Text>
                            </View>
                        )}
                        {additionalCerts.map((cert: any, index: number) => (
                            <View key={`cert-${index}`} style={[styles.verifiedBadge, { backgroundColor: '#F3E5F5', borderColor: '#E1BEE7' }]}>
                                <Text style={[styles.verifiedText, { color: '#7B1FA2' }]}>📜 {cert.name}</Text>
                            </View>
                        ))}
                        {isSponsored && (
                            <View style={[styles.verifiedBadge, { backgroundColor: '#FFF9C4', borderColor: '#FFF176' }]}>
                                <Text style={[styles.verifiedText, { color: '#F57F17' }]}>✅ VERIFIED PRO</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* SERVICE GALLERY PREVIEW */}
                {galleryUrls.length > 0 && (
                    <View style={styles.galleryPreviewContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                            {galleryUrls.map((imgUrl: string, idx: number) => (
                                <TouchableOpacity key={idx} style={styles.galleryThumbButton} onPress={() => setViewingGallery({ images: galleryUrls, index: idx })}>
                                    <Image source={{ uri: imgUrl }} style={styles.galleryThumb} onError={() => markImageFailed(imgUrl)} />
                                    <Text style={styles.galleryThumbLabel}>VIEW</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={THEME.navy} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>CHOOSE YOUR PRO</Text>
                    <Text style={styles.headerSubtitle}>{category}</Text>
                </View>
            </View>

            {/* Subheader Info */}
            <View style={styles.subHeader}>
                <Text style={styles.instructionText}>Select up to 4 to receive private quotes</Text>
                {searchStatus === "global" && (
                    <View style={styles.warningContainer}>
                        <Text style={styles.warningText}>
                            We could not find matching vendors in {userRegion || "your region"}. Showing professionals from nearby areas in {userProvince || "your province"}.
                        </Text>
                    </View>
                )}
                {(userRegion || userProvince) && searchStatus !== "global" ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ color: THEME.gold, fontSize: 10, marginRight: 4 }}>📍</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {userRegion}{userRegion && userProvince ? ', ' : ''}{userProvince}
                        </Text>
                    </View>
                ) : null}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={THEME.gold} />
                </View>
            ) : (
                <FlatList
                    data={vendors.slice(0, visibleCount)}
                    renderItem={renderVendor}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No results found in this area.</Text>
                        </View>
                    }
                    ListFooterComponent={
                        visibleCount < vendors.length ? (
                            <TouchableOpacity
                                onPress={() => setVisibleCount(prev => prev + 8)}
                                style={styles.loadMoreButton}
                            >
                                <Text style={styles.loadMoreText}>See More Professionals ↓</Text>
                            </TouchableOpacity>
                        ) : null
                    }
                />
            )}

            {/* Bottom Action Bar */}
            {selectedForQuote.length > 0 && (
                <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
                    <Text style={styles.selectedCountText}>{selectedForQuote.length} / 4 Selected</Text>
                    <TouchableOpacity
                        onPress={handleRequestQuotes}
                        style={styles.requestButton}
                    >
                        <Text style={styles.requestButtonText}>REQUEST QUOTES</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Reviews Modal */}
            <Modal visible={!!selectedVendorForReviews} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{selectedVendorForReviews?.name}</Text>
                        <Text style={styles.modalSubtitle}>Customer Reviews</Text>

                        <View style={styles.sortContainer}>
                            <TouchableOpacity onPress={() => setReviewSort('recent')} style={[styles.sortButton, reviewSort === 'recent' && styles.sortButtonActive]}>
                                <Text style={[styles.sortButtonText, reviewSort === 'recent' && styles.sortButtonTextActive]}>Most Recent</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setReviewSort('rating')} style={[styles.sortButton, reviewSort === 'rating' && styles.sortButtonActive]}>
                                <Text style={[styles.sortButtonText, reviewSort === 'rating' && styles.sortButtonTextActive]}>Highest Rated</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingReviews ? (
                            <ActivityIndicator color={THEME.navy} style={{ marginVertical: 20 }} />
                        ) : (
                            <ScrollView style={{ maxHeight: 300 }}>
                                {vendorReviews.length > 0 ? [...vendorReviews].sort((a, b) => {
                                    if (reviewSort === 'rating') return (b.rating || 0) - (a.rating || 0);
                                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                                }).map((rev) => (
                                    <View key={rev.id} style={styles.reviewItem}>
                                        <View style={styles.reviewHeader}>
                                            <Text style={styles.reviewUser}>{rev.customerName || 'Anonymous'}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={styles.reviewDate}>{rev.createdAt?.toDate().toLocaleDateString()}</Text>
                                                <Text style={styles.reviewRating}>★ {rev.rating}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.reviewComment}>{`"${rev.comment}"`}</Text>
                                    </View>
                                )) : (
                                    <Text style={styles.noReviewsText}>No reviews yet.</Text>
                                )}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            onPress={() => setSelectedVendorForReviews(null)}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeButtonText}>CLOSE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Credentials Modal */}
            <Modal visible={!!viewingCredentials} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{viewingCredentials?.name}</Text>
                        <Text style={styles.modalSubtitle}>Verification Details</Text>

                        {viewingCredentials && (() => {
                            const credentials = getVendorCredentialDetails(viewingCredentials);
                            const rows = [
                                ...(!viewingCredentials.isIndependentContractor && viewingCredentials.cipcRegistrationNumber
                                    ? [{
                                        label: "CIPC Registration",
                                        value: viewingCredentials.cipcRegistrationNumber,
                                        url: viewingCredentials.cipcDocumentUrl
                                    }]
                                    : []),
                                ...(credentials.mapping && credentials.serviceNumber
                                    ? [{
                                        label: credentials.mapping.label,
                                        value: credentials.serviceNumber,
                                        url: viewingCredentials[credentials.mapping.docField]
                                    }]
                                    : []),
                                ...credentials.additionalCerts.map((cert: any) => ({
                                    label: "Additional Certification",
                                    value: cert.name,
                                    url: cert.url
                                }))
                            ];

                            return rows.length > 0 ? (
                                <ScrollView style={{ maxHeight: 320 }}>
                                    {rows.map((row, index) => (
                                        <View key={`credential-row-${index}`} style={styles.credentialDetailRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.credentialDetailLabel}>{row.label}</Text>
                                                <Text style={styles.credentialDetailValue}>{row.value}</Text>
                                            </View>
                                            {row.url ? (
                                                <TouchableOpacity onPress={() => openDocumentUrl(row.url)} style={styles.credentialViewButton}>
                                                    <Text style={styles.credentialViewButtonText}>VIEW</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                    ))}
                                </ScrollView>
                            ) : (
                                <Text style={styles.noReviewsText}>
                                    {viewingCredentials.isIndependentContractor ? "Independent contractor profile." : "Verification details pending review."}
                                </Text>
                            );
                        })()}

                        <TouchableOpacity
                            onPress={() => setViewingCredentials(null)}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeButtonText}>CLOSE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Request Form Modal */}
            <RequestQuoteModal
                visible={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                category={category}
                selectedVendorIds={selectedForQuote}
                initialData={formData}
                availableVendors={vendors}
            />

            {/* Gallery Viewer Modal */}
            <Modal visible={!!viewingGallery} animationType="fade" transparent>
                <View style={styles.galleryOverlay}>
                    <TouchableOpacity style={styles.galleryClose} onPress={() => setViewingGallery(null)}>
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>
                    {viewingGallery && (
                        <Image 
                            source={{ uri: viewingGallery.images[viewingGallery.index] }} 
                            style={styles.fullImage}
                            resizeMode="contain"
                            onError={() => markImageFailed(viewingGallery.images[viewingGallery.index])}
                        />
                    )}
                    <View style={styles.galleryNav}>
                        {viewingGallery && viewingGallery.images.length > 1 && (
                            <>
                                <TouchableOpacity 
                                    onPress={() => setViewingGallery(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null)}
                                    style={styles.navButton}
                                >
                                    <Ionicons name="chevron-back" size={32} color="white" />
                                </TouchableOpacity>
                                <Text style={styles.galleryCounter}>
                                    {viewingGallery.index + 1} / {viewingGallery.images.length}
                                </Text>
                                <TouchableOpacity 
                                    onPress={() => setViewingGallery(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null)}
                                    style={styles.navButton}
                                >
                                    <Ionicons name="chevron-forward" size={32} color="white" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.gray },
    header: {
        backgroundColor: THEME.white,
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 0 : 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        zIndex: 100,
    },
    backButton: { marginRight: 16 },
    headerTitle: { color: THEME.navy, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
    headerSubtitle: { color: THEME.gold, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    subHeader: { padding: 16, paddingBottom: 0 },
    instructionText: { fontSize: 10, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
    warningContainer: {
        backgroundColor: '#FFF3E0',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#FFE0B2'
    },
    warningText: {
        color: '#E65100',
        fontSize: 11,
        fontWeight: 'bold',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },

    // Card Styles
    card: {
        backgroundColor: THEME.navy,
        borderRadius: 25,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000046",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,31,63,0.05)',
    },
    cardSelected: {
        borderColor: THEME.gold,
        borderWidth: 2,
    },
    sponsoredBadge: {
        position: 'absolute',
        top: -10,
        left: 20,
        backgroundColor: THEME.gold,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        zIndex: 10,
    },
    sponsoredText: { fontSize: 8, fontWeight: '900', color: THEME.navy },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    checkboxContainer: { marginRight: 12 },
    logoContainer: { width: 60, height: 60, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
    logo: { width: '100%', height: '100%' },
    logoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    logoPlaceholderText: { fontSize: 10, fontWeight: '900', color: 'rgba(255, 255, 255, 0.3)' },
    infoContainer: { flex: 1, marginLeft: 12 },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    vendorName: { fontSize: 16, fontWeight: '900', color: THEME.white },
    ratingBadge: { backgroundColor: '#FFF9C4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    ratingText: { fontSize: 10, fontWeight: 'bold', color: '#F57F17' },
    locationText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 },
    credentialBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
    credentialText: { fontSize: 9, fontWeight: 'bold', color: '#1565C0', textTransform: 'uppercase' },
    description: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic', marginBottom: 15, lineHeight: 20 },
    credentialsPanel: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 10, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    credentialsTitle: { color: THEME.gold, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    credentialsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    noCredentialText: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewsLink: { fontSize: 12, fontWeight: '900', color: THEME.gold, textDecorationLine: 'underline' },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#B2F5EA'
    },
    credentialProofBadge: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
    },
    verifiedText: { fontSize: 8, fontWeight: '900' },

    // Empty & Load More
    emptyContainer: { padding: 40, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
    emptyText: { color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', textTransform: 'uppercase' },
    loadMoreButton: { padding: 16, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', marginTop: 10 },
    loadMoreText: { fontSize: 12, fontWeight: '900', color: THEME.white, textTransform: 'uppercase' },

    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: THEME.navy,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 10,
    },
    selectedCountText: { color: THEME.white, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
    requestButton: { backgroundColor: THEME.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
    requestButtonText: { color: THEME.navy, fontWeight: '900', fontSize: 12 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,31,63,0.95)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 32, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: THEME.white, textTransform: 'uppercase' },
    modalSubtitle: { fontSize: 10, fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)', paddingBottom: 8 },
    sortContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    sortButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
    sortButtonActive: { backgroundColor: THEME.gold },
    sortButtonText: { fontSize: 10, fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' },
    sortButtonTextActive: { color: THEME.navy },
    reviewItem: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)', paddingBottom: 12 },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    reviewUser: { fontSize: 12, fontWeight: '900', color: THEME.white },
    reviewRating: { fontSize: 12, fontWeight: 'bold', color: THEME.gold },
    reviewDate: { fontSize: 10, fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.3)', marginRight: 8 },
    reviewComment: { fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' },
    noReviewsText: { textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', marginVertical: 20 },
    closeButton: { backgroundColor: THEME.gold, padding: 16, borderRadius: 20, alignItems: 'center', marginTop: 10 },
    closeButtonText: { color: THEME.navy, fontWeight: '900', fontSize: 12 },
    credentialDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
    credentialDetailLabel: { color: THEME.gold, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
    credentialDetailValue: { color: THEME.white, fontSize: 13, fontWeight: '700' },
    credentialViewButton: { backgroundColor: THEME.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    credentialViewButtonText: { color: THEME.navy, fontSize: 10, fontWeight: '900' },

    // Form Styles
    formScroll: { paddingBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', color: THEME.gold, marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 12, fontSize: 14, color: THEME.white },
    urgencyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 12,
    },
    urgencyButton: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    urgencyButtonActive: {
        backgroundColor: THEME.gold,
        borderColor: THEME.gold,
    },
    urgencyButtonText: { fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.6)', fontSize: 10, textAlign: 'center' },
    urgencyButtonTextActive: {
        color: THEME.navy,
    },
    submitButton: { backgroundColor: THEME.gold, padding: 16, borderRadius: 20, alignItems: 'center', marginTop: 24 },
    submitButtonText: { color: THEME.navy, fontWeight: '900', fontSize: 14 },
    imageUpload: {
        height: 150,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderStyle: 'dashed',
        marginTop: 10,
        marginBottom: 10,
    },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    uploadPlaceholder: { alignItems: 'center' },
    uploadText: { marginTop: 8, fontSize: 12, color: THEME.placeholder, fontWeight: '600' },
    removeButton: {
        alignSelf: 'center',
        marginTop: 5,
        padding: 5,
    },
    removeButtonText: {
        color: 'red',
        fontSize: 12,
        fontWeight: 'bold',
    },
    galleryPreviewContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,31,63,0.05)',
    },
    galleryScroll: {
        gap: 10,
        paddingRight: 20,
    },
    galleryThumb: {
        width: 80,
        height: 80,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    galleryThumbButton: {
        position: 'relative',
        width: 80,
        height: 80,
    },
    galleryThumbLabel: {
        position: 'absolute',
        left: 6,
        right: 6,
        bottom: 6,
        paddingVertical: 3,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,31,63,0.82)',
        color: THEME.white,
        fontSize: 8,
        fontWeight: '900',
        textAlign: 'center',
    },
    galleryOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryClose: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 100,
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
    galleryNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 40,
        width: '100%',
        gap: 30,
    },
    navButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryCounter: {
        color: 'white',
        fontWeight: '900',
        fontSize: 14,
    },
});
