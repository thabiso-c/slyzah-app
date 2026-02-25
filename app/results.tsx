import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
import { GOOGLE_MAPS_API_KEY } from './secrets';
import { sendPushNotification, sendResendEmail } from './services';

const { width, height } = Dimensions.get('window');

const THEME = {
    navy: '#001f3f',
    gold: '#FFD700',
    white: '#FFFFFF',
    gray: '#F3F4F6',
    placeholder: '#9CA3AF',
    text: '#001f3f'
};

// --- Request Quote Modal Component ---
const RequestQuoteModal = ({ visible, onClose, category, selectedVendorIds, initialData, availableVendors }: any) => {
    const [formData, setFormData] = useState(initialData);
    const [submitting, setSubmitting] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [urgency, setUrgency] = useState<'urgent' | 'standard' | 'comparing'>('standard');

    const router = useRouter();

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
        console.log("Starting handleSubmit in RequestQuoteModal (results.tsx)");
        if (!formData.name || !formData.phone || !formData.issue) {
            Alert.alert("Missing Fields", "Please fill in your name, phone, and issue.");
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

            console.log("Creating lead document...");
            const docRef = await addDoc(collection(db, "leads"), {
                customerId: user?.uid || "guest",
                customerName: formData.name,
                customerPhone: formData.phone,
                customerEmail: formData.email,
                category: category,
                issueDescription: formData.issue, // Aligned with Web
                address: formData.address,        // Aligned with Web
                imageUrl: imageUrl,
                urgency: urgency,
                town: formData.town,
                vendorIds: selectedVendorIds,
                status: "open",                   // Aligned with Web
                createdAt: serverTimestamp(),
                platform: "mobile",
                quotes: {}                        // Initialize empty map for quotes
            });
            console.log("Lead created successfully with ID:", docRef.id);

            // Create Notifications & Trigger Emails for Vendors
            console.log("Processing vendors:", selectedVendorIds);
            if (selectedVendorIds.length > 0) {
                // Process vendors sequentially to avoid rate limiting/concurrency issues with email API
                for (const vendorId of selectedVendorIds) {
                    try {
                        console.log(`Processing vendor ID: ${vendorId}`);
                        // Optimization: Use passed vendor data if available, else fetch
                        let vendorData = availableVendors?.find((v: any) => v.id === vendorId);

                        if (!vendorData) {
                            const vendorSnap = await getDoc(doc(db, "professionals", vendorId));
                            if (vendorSnap.exists()) {
                                vendorData = vendorSnap.data();
                            }
                        }

                        if (!vendorData) {
                            console.warn(`Vendor data not found for ID: ${vendorId}`);
                            continue;
                        };

                        // Send Email via Resend
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
                                urgency
                            );
                        }

                        // Create dashboard notification
                        await addDoc(collection(db, "professionals", vendorId, "notifications"), {
                            type: "lead",
                            notificationMessage: `New Request: ${formData.issue} in ${formData.town}`,
                            status: "unread",
                            createdAt: serverTimestamp(),
                            leadId: docRef.id
                        });

                        // Send Push Notification
                        if (vendorData.expoPushToken) {
                            await sendPushNotification(vendorData.expoPushToken, `New Lead: ${category}`, formData.issue, { leadId: docRef.id, urgency: urgency });
                        }

                    } catch (e) {
                        console.error("Error notifying vendor:", vendorId, e);
                    }
                }
                console.log("All vendor notifications processed.");
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

    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(8);
    const [searchStatus, setSearchStatus] = useState<"local" | "global" | "none">("local");
    const [selectedForQuote, setSelectedForQuote] = useState<string[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: auth.currentUser?.displayName || "",
        phone: "",
        email: auth.currentUser?.email || "",
        issue: "",
        address: "",
        town: userRegion
    });

    const [selectedVendorForReviews, setSelectedVendorForReviews] = useState<any>(null);
    const [vendorReviews, setVendorReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [reviewSort, setReviewSort] = useState<'recent' | 'rating'>('recent');

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

                // Optimization: Limit to 100 to prevent reading entire DB
                const q = query(collection(db, "professionals"), limit(100));
                const querySnapshot = await getDocs(q);
                let allVendorsFromDb = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

                // 1. Filter by Keyword
                let matchedVendors = allVendorsFromDb.filter(vendor => {
                    const vendorCat = (vendor.category || "").toLowerCase();
                    const vendorDesc = (vendor.fullCategoryDescription || "").toLowerCase();
                    return searchKeywords.some(keyword => vendorCat.includes(keyword) || vendorDesc.includes(keyword));
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

                        // 3. Rating Tie-Breaker
                        score += (v.rating || 0);

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

                // Check local presence
                const hasLocalPresence = matchedVendors.some(v =>
                    (Array.isArray(v.regions) && v.regions.some((r: string) => r.toLowerCase() === userRegion?.toLowerCase())) ||
                    (Array.isArray(v.provinces) && v.provinces.some((p: string) => p.toLowerCase() === userProvince?.toLowerCase()))
                );

                if (matchedVendors.length > 0) {
                    setVendors(processAndSort(matchedVendors));
                    setSearchStatus(hasLocalPresence ? "local" : "global");
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
        if (!auth.currentUser) {
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
        const isSponsored = ["One Region", "Three Regions", "Provincial", "Multi-Province"].includes(item.tier);
        const isSelected = selectedForQuote.includes(item.id);

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
                        {item.logo && item.logo.trim() !== "" ? (
                            <Image source={{ uri: item.logo }} style={styles.logo} />
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
                        <Text style={styles.locationText}>
                            {item.tier === "Multi-Province" ? "🌍 National Coverage" : `📍 ${item.region || item.town || "Verified Area"}`}
                        </Text>
                    </View>
                </View>

                <Text style={styles.description} numberOfLines={2}>
                    "{item.fullCategoryDescription || "Professional service provider available for call-outs."}"
                </Text>

                <View style={styles.cardFooter}>
                    <TouchableOpacity onPress={() => fetchReviews(item)}>
                        <Text style={styles.reviewsLink}>SEE REVIEWS</Text>
                    </TouchableOpacity>
                    {isSponsored && (
                        <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>✅ VERIFIED PRO</Text>
                        </View>
                    )}
                </View>
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
                    <View style={styles.globalBadge}>
                        <Text style={styles.globalBadgeText}>Showing nearby matches</Text>
                    </View>
                )}
                {(userRegion || userProvince) ? (
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
                                        <Text style={styles.reviewComment}>"{rev.comment}"</Text>
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

            {/* Request Form Modal */}
            <RequestQuoteModal
                visible={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                category={category}
                selectedVendorIds={selectedForQuote}
                initialData={formData}
                availableVendors={vendors}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.gray },
    header: {
        backgroundColor: THEME.white,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: { marginRight: 16 },
    headerTitle: { color: THEME.navy, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
    headerSubtitle: { color: THEME.gold, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    subHeader: { padding: 16, paddingBottom: 0 },
    instructionText: { fontSize: 10, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
    globalBadge: { backgroundColor: THEME.navy, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginTop: 8 },
    globalBadgeText: { color: THEME.white, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },

    // Card Styles
    card: {
        backgroundColor: THEME.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardSelected: {
        borderColor: THEME.gold,
        backgroundColor: '#FFFDF0',
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
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkboxContainer: { marginRight: 12 },
    logoContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: THEME.navy,
        overflow: 'hidden',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: { width: '100%', height: '100%' },
    logoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    logoPlaceholderText: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900' },
    infoContainer: { flex: 1 },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    vendorName: { fontSize: 16, fontWeight: '900', color: THEME.navy, flex: 1 },
    ratingBadge: { backgroundColor: '#FFF9C4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    ratingText: { fontSize: 10, fontWeight: 'bold', color: '#F57F17' },
    locationText: { fontSize: 10, color: '#888', fontWeight: 'bold', marginTop: 2, textTransform: 'uppercase' },
    description: { fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 12, lineHeight: 18 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewsLink: { fontSize: 12, fontWeight: '900', color: THEME.navy, textDecorationLine: 'underline' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center' },
    verifiedText: { fontSize: 9, fontWeight: '900', color: 'green' },

    // Empty & Load More
    emptyContainer: { padding: 40, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', borderRadius: 20 },
    emptyText: { color: '#999', fontWeight: 'bold', textTransform: 'uppercase' },
    loadMoreButton: { padding: 16, alignItems: 'center', backgroundColor: THEME.white, borderRadius: 30, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', marginTop: 10 },
    loadMoreText: { fontSize: 12, fontWeight: '900', color: THEME.navy, textTransform: 'uppercase' },

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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,31,63,0.9)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: THEME.white, borderRadius: 30, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: THEME.navy, textTransform: 'uppercase' },
    modalSubtitle: { fontSize: 10, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    sortContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    sortButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: '#f0f0f0' },
    sortButtonActive: { backgroundColor: THEME.navy },
    sortButtonText: { fontSize: 10, fontWeight: 'bold', color: '#888', textTransform: 'uppercase' },
    sortButtonTextActive: { color: THEME.white },
    reviewItem: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 12 },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    reviewUser: { fontSize: 12, fontWeight: '900', color: THEME.navy },
    reviewRating: { fontSize: 12, fontWeight: 'bold', color: THEME.gold },
    reviewDate: { fontSize: 10, fontWeight: 'bold', color: '#999', marginRight: 8 },
    reviewComment: { fontSize: 12, color: '#555', fontStyle: 'italic' },
    noReviewsText: { textAlign: 'center', color: '#999', fontStyle: 'italic', marginVertical: 20 },
    closeButton: { backgroundColor: THEME.navy, padding: 16, borderRadius: 20, alignItems: 'center', marginTop: 10 },
    closeButtonText: { color: THEME.white, fontWeight: '900', fontSize: 12 },

    // Form Styles
    formScroll: { paddingBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', color: THEME.navy, marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: THEME.gray, borderRadius: 12, padding: 12, fontSize: 14, color: THEME.navy },
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
        backgroundColor: THEME.gray,
        alignItems: 'center',
    },
    urgencyButtonActive: {
        backgroundColor: THEME.navy,
    },
    urgencyButtonText: { fontWeight: 'bold', color: THEME.navy, fontSize: 10, textAlign: 'center' },
    urgencyButtonTextActive: {
        color: THEME.white,
    },
    submitButton: { backgroundColor: THEME.gold, padding: 16, borderRadius: 20, alignItems: 'center', marginTop: 24 },
    submitButtonText: { color: THEME.navy, fontWeight: '900', fontSize: 14 },
    imageUpload: {
        height: 150,
        backgroundColor: THEME.gray,
        borderRadius: 16,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
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
});
