import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    findNodeHandle
} from 'react-native';
import { GooglePlaceData, GooglePlaceDetail, GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, storage } from '../firebaseConfig';
import { GOOGLE_MAPS_API_KEY } from '../lib/secrets';
import { sendResendEmail } from '../lib/services';
import { sendPushNotification } from '../lib/api_client';

const { width } = Dimensions.get('window');

const THEME = {
    navy: '#001f3f',
    gold: '#FFD700',
    white: '#FFFFFF',
    gray: '#F3F4F6',
    placeholder: '#9CA3AF',
};

export default function RequestQuoteForm() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<ScrollView>(null);

    // Extract params safely
    const category = Array.isArray(params.category) ? params.category[0] : params.category || "";
    const userRegion = Array.isArray(params.userRegion) ? params.userRegion[0] : params.userRegion || "";

    // Parse selectedVendorIds (passed as JSON string usually)
    let selectedVendorIds: string[] = [];
    try {
        if (params.selectedVendorIds) {
            selectedVendorIds = typeof params.selectedVendorIds === 'string'
                ? JSON.parse(params.selectedVendorIds)
                : params.selectedVendorIds;
        }
    } catch (e) {
        console.error("Error parsing vendor IDs in RequestQuoteForm:", e);
        console.log("Error parsing vendor IDs", e);
    }

    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [urgency, setUrgency] = useState<'urgent' | 'standard' | 'comparing'>('standard');

    const nameInputRef = useRef<TextInput>(null);
    const phoneInputRef = useRef<TextInput>(null);
    const emailInputRef = useRef<TextInput>(null);
    const addressInputContainerRef = useRef<View>(null);
    const townInputRef = useRef<TextInput>(null);
    const issueInputRef = useRef<TextInput>(null);

    const [formData, setFormData] = useState({
        name: auth.currentUser?.displayName || "",
        phone: "",
        email: auth.currentUser?.email || "",
        issue: "",
        address: "",
        town: userRegion
    });

    const [step, setStep] = useState(1);
    const totalSteps = 3;

    const handleFocus = (ref: React.RefObject<View | TextInput | null>) => {
        if (ref.current && scrollViewRef.current) {
            const node = findNodeHandle(scrollViewRef.current);
            if (node) {
                ref.current.measureLayout(
                    node,
                    (x, y) => {
                        scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
                    }
                );
            }
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleFinalSubmit = async () => {
        console.log("Starting handleFinalSubmit in RequestQuoteForm");
        if (!agreedToTerms) {
            Alert.alert("Terms Required", "Please agree to the terms to continue.");
            return;
        }

        if (!formData.name.trim() || !formData.phone.trim() || !formData.issue.trim()) {
            Alert.alert("Missing Fields", "Please fill in all required fields.");
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Login Required", "Please log in first.");
            return;
        }

        setLoading(true);

        try {
            let imageUrl = "";
            if (imageUri) {
                // Convert URI to Blob for Firebase Storage
                const response = await fetch(imageUri);
                const blob = await response.blob();

                const storageRef = ref(storage, `leads/${user.uid}/${Date.now()}_image.jpg`);
                const snapshot = await uploadBytes(storageRef, blob);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            const leadData = {
                customerId: user.uid,
                customerName: formData.name,
                customerPhone: formData.phone,
                customerEmail: formData.email,
                issueDescription: formData.issue,
                address: formData.address,
                imageUrl: imageUrl,
                town: formData.town,
                category,
                region: userRegion,
                urgency: urgency,
                vendorIds: selectedVendorIds,
                status: "open",
                createdAt: serverTimestamp(),
                quotes: {},
                legal: {
                    termsAgreed: true,
                    privacyPolicyAccepted: true,
                    consentTimestamp: serverTimestamp(),
                    processingPurpose: "Lead generation and vendor connection",
                    platformRole: "Intermediary / Marketplace Provider"
                },
                platform: "mobile"
            };

            // 1. Save to 'leads' collection
            console.log("Creating lead document...");
            const docRef = await addDoc(collection(db, "leads"), leadData);
            console.log("Lead created successfully with ID:", docRef.id);

            // 2. Create Notifications & Trigger Emails for Vendors
            console.log("Processing vendors:", selectedVendorIds);
            if (selectedVendorIds.length > 0) {
                // Process vendors sequentially to avoid rate limiting/concurrency issues with email API
                for (const vendorId of selectedVendorIds) {
                    try {
                        console.log(`Processing vendor ID: ${vendorId}`);
                        // Fetch Vendor Details for Email
                        const vendorSnap = await getDoc(doc(db, "professionals", vendorId));

                        if (!vendorSnap.exists()) {
                            console.error(`Vendor document not found for ID: ${vendorId}`);
                            continue;
                        }

                        const vendorData = vendorSnap.data();
                        console.log(`Vendor data found for ${vendorId}. Email: ${vendorData?.email}`);

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

                            // Add a delay between emails to ensure reliable delivery
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } else {
                            console.warn(`No email address found for vendor ${vendorId}`);
                        }

                        console.log(`Creating dashboard notification for ${vendorId}`);
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
                        console.log(`Notification created for ${vendorId}`);
                    } catch (innerError) {
                        console.error(`Error processing vendor ${vendorId}:`, innerError);
                    }
                }
                console.log("All vendor notifications processed.");
            }

            Alert.alert("Success", "Request sent successfully!", [
                { text: "OK", onPress: () => router.replace('/dashboard') }
            ]);

        } catch (error) {
            console.error("Submission Error:", error);
            Alert.alert("Error", "Submission failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={styles.closeButton}>
                    <Ionicons name={step > 1 ? "arrow-back" : "close"} size={24} color={THEME.navy} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>STEP {step} OF {totalSteps}</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${(step / totalSteps) * 100}%` }]} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    {step === 1 && (
                        <View>
                            <Text style={styles.stepTitle}>How urgently do you need service?</Text>
                            <Text style={styles.stepSubtitle}>This helps us notify the right professionals for your needs.</Text>
                            
                            <View style={styles.fieldContainer}>
                                <View style={styles.urgencyContainerVertical}>
                                    <TouchableOpacity
                                        style={[styles.urgencyOption, urgency === 'urgent' && styles.urgencyOptionActive]}
                                        onPress={() => setUrgency('urgent')}>
                                        <View style={[styles.iconCircle, urgency === 'urgent' && { backgroundColor: THEME.white }]}>
                                            <Ionicons name="flash" size={20} color={urgency === 'urgent' ? THEME.navy : THEME.gold} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.urgencyOptionTitle, urgency === 'urgent' && { color: THEME.white }]}>Urgent Service</Text>
                                            <Text style={[styles.urgencyOptionSub, urgency === 'urgent' && { color: 'rgba(255,255,255,0.7)' }]}>Need help as soon as possible</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.urgencyOption, urgency === 'standard' && styles.urgencyOptionActive]}
                                        onPress={() => setUrgency('standard')}>
                                        <View style={[styles.iconCircle, urgency === 'standard' && { backgroundColor: THEME.white }]}>
                                            <Ionicons name="calendar" size={20} color={urgency === 'standard' ? THEME.navy : '#3B82F6'} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.urgencyOptionTitle, urgency === 'standard' && { color: THEME.white }]}>Standard Service</Text>
                                            <Text style={[styles.urgencyOptionSub, urgency === 'standard' && { color: 'rgba(255,255,255,0.7)' }]}>Flexible timing, next few days</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.urgencyOption, urgency === 'comparing' && styles.urgencyOptionActive]}
                                        onPress={() => setUrgency('comparing')}>
                                        <View style={[styles.iconCircle, urgency === 'comparing' && { backgroundColor: THEME.white }]}>
                                            <Ionicons name="search" size={20} color={urgency === 'comparing' ? THEME.navy : '#9CA3AF'} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.urgencyOptionTitle, urgency === 'comparing' && { color: THEME.white }]}>Comparing Quotes</Text>
                                            <Text style={[styles.urgencyOptionSub, urgency === 'comparing' && { color: 'rgba(255,255,255,0.7)' }]}>Just gathering information for now</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 2 && (
                        <View>
                            <Text style={styles.stepTitle}>Tell us about the job</Text>
                            <Text style={styles.stepSubtitle}>Be specific so pros can give you accurate quotes.</Text>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>ISSUE DESCRIPTION</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={formData.issue}
                                    onChangeText={(t) => setFormData({ ...formData, issue: t })}
                                    multiline
                                    numberOfLines={4}
                                    placeholder="e.g. My kitchen sink is leaking from the pipe underneath..."
                                    placeholderTextColor={THEME.placeholder}
                                    ref={issueInputRef}
                                    onFocus={() => handleFocus(issueInputRef)}
                                />
                            </View>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>ATTACH IMAGE (OPTIONAL)</Text>
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
                            </View>
                        </View>
                    )}

                    {step === 3 && (
                        <View>
                            <Text style={styles.stepTitle}>Contact & Location</Text>
                            <Text style={styles.stepSubtitle}>Where should the professional meet you?</Text>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>FULL NAME</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.name}
                                    onChangeText={(t) => setFormData({ ...formData, name: t })}
                                    placeholder="John Doe"
                                    placeholderTextColor={THEME.placeholder}
                                    ref={nameInputRef}
                                    onFocus={() => handleFocus(nameInputRef)}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.fieldContainer, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.label}>PHONE</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.phone}
                                        onChangeText={(t) => setFormData({ ...formData, phone: t })}
                                        keyboardType="phone-pad"
                                        placeholder="082 123 4567"
                                        placeholderTextColor={THEME.placeholder}
                                        ref={phoneInputRef}
                                        onFocus={() => handleFocus(phoneInputRef)}
                                    />
                                </View>
                                <View style={[styles.fieldContainer, { flex: 1 }]}>
                                    <Text style={styles.label}>EMAIL</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.email}
                                        onChangeText={(t) => setFormData({ ...formData, email: t })}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        placeholder="john@example.com"
                                        placeholderTextColor={THEME.placeholder}
                                        ref={emailInputRef}
                                        onFocus={() => handleFocus(emailInputRef)}
                                    />
                                </View>
                            </View>

                            <View ref={addressInputContainerRef} style={[styles.fieldContainer, { zIndex: 100, elevation: 100 }]}>
                                <Text style={styles.label}>STREET ADDRESS</Text>
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
                                            town = neighborhood || subLocality || locality;
                                        }
                                        setFormData(prev => ({ ...prev, address, town: town || prev.town }));
                                    }}
                                    query={{
                                        key: GOOGLE_MAPS_API_KEY,
                                        language: 'en',
                                        components: 'country:za',
                                    }}
                                    fetchDetails={true}
                                    fields={'address_components,geometry,formatted_address'}
                                    styles={{
                                        textInput: styles.input,
                                        listView: { position: 'absolute', top: 60, width: '100%', backgroundColor: 'white', borderRadius: 10, elevation: 101, zIndex: 101 },
                                    }}
                                    enablePoweredByContainer={false}
                                    textInputProps={{
                                        onFocus: () => handleFocus(addressInputContainerRef),
                                        placeholderTextColor: THEME.placeholder,
                                        onChangeText: (text) => setFormData(prev => ({ ...prev, address: text })),
                                        returnKeyType: "search"
                                    }}
                                />
                            </View>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>TOWN / SUBURB</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.town}
                                    onChangeText={(t) => setFormData({ ...formData, town: t })}
                                    placeholder="Sandton"
                                    placeholderTextColor={THEME.placeholder}
                                    ref={townInputRef}
                                    onFocus={() => handleFocus(townInputRef)}
                                />
                            </View>

                            <View style={styles.legalContainer}>
                                <TouchableOpacity
                                    style={styles.checkbox}
                                    onPress={() => setAgreedToTerms(!agreedToTerms)}
                                >
                                    <Ionicons
                                        name={agreedToTerms ? "checkbox" : "square-outline"}
                                        size={24}
                                        color={THEME.gold}
                                    />
                                </TouchableOpacity>
                                <Text style={styles.legalText}>
                                    I agree to the Terms of Use and Privacy Policy. I explicitly consent to Slyzah sharing my contact details with selected vendors.
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Footer Button */}
                <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.disabledButton]}
                        onPress={() => {
                            if (step < totalSteps) {
                                if (step === 2 && !formData.issue.trim()) {
                                    Alert.alert("Missing Info", "Please describe your issue.");
                                    return;
                                }
                                setStep(step + 1);
                            } else {
                                handleFinalSubmit();
                            }
                        }}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={THEME.navy} />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {step < totalSteps ? "CONTINUE" : "SUBMIT PRIVATE REQUEST"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: THEME.gray,
    },
    closeButton: {
        padding: 5,
    },
    headerTitle: { fontSize: 13, fontWeight: '900', color: THEME.navy, letterSpacing: 1 },
    progressContainer: { height: 6, backgroundColor: THEME.gray, width: '100%' },
    progressBar: { height: '100%', backgroundColor: THEME.gold },
    stepTitle: { fontSize: 24, fontWeight: '900', color: THEME.navy, marginBottom: 8, marginTop: 10 },
    stepSubtitle: { fontSize: 15, color: '#666', marginBottom: 25, lineHeight: 22 },
    urgencyContainerVertical: { gap: 15 },
    urgencyOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 24,
        backgroundColor: THEME.gray,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    urgencyOptionActive: {
        backgroundColor: THEME.navy,
        borderColor: THEME.gold,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,31,63,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    urgencyOptionTitle: { fontSize: 16, fontWeight: '900', color: THEME.navy },
    urgencyOptionSub: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
    content: { padding: 25, paddingBottom: 100 },
    fieldContainer: { marginBottom: 25 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    label: {
        fontSize: 10,
        fontWeight: '900',
        color: THEME.navy,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: THEME.gray,
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        fontWeight: '600',
        color: THEME.navy,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    imageUpload: {
        height: 160,
        backgroundColor: THEME.gray,
        borderRadius: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    uploadPlaceholder: { alignItems: 'center' },
    uploadText: { marginTop: 8, fontSize: 12, color: THEME.placeholder, fontWeight: '600' },
    removeButton: { alignSelf: 'center', marginTop: 10, padding: 5 },
    removeButtonText: { color: 'red', fontSize: 12, fontWeight: 'bold' },
    legalContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F0F9FF',
        padding: 20,
        borderRadius: 24,
        marginTop: 10,
    },
    checkbox: { marginRight: 12, marginTop: -2 },
    legalText: { flex: 1, fontSize: 11, color: THEME.navy, lineHeight: 18 },
    footer: {
        padding: 25,
        borderTopWidth: 1, borderTopColor: THEME.gray,
        backgroundColor: THEME.white,
    },
    submitButton: {
        backgroundColor: THEME.gold,
        paddingVertical: 20,
        borderRadius: 35,
        alignItems: 'center',
        shadowColor: THEME.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    disabledButton: { opacity: 0.7 },
    submitButtonText: {
        color: THEME.navy,
        fontSize: 15,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
});
