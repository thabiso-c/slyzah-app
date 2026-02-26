import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
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
    View
} from 'react-native';
import { GooglePlaceData, GooglePlaceDetail, GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, storage } from '../firebaseConfig';
import { GOOGLE_MAPS_API_KEY } from './secrets';
<<<<<<< HEAD
import { sendResendEmail } from './services';
=======
import { sendPushNotification, sendResendEmail } from './services';
>>>>>>> 6ea35de (feat: Secure API keys and fix module resolution)

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

    const [formData, setFormData] = useState({
        name: auth.currentUser?.displayName || "",
        phone: "",
        email: auth.currentUser?.email || "",
        issue: "",
        address: "",
        town: userRegion
    });

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
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={THEME.navy} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>REQUEST QUOTATION</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {/* Form Fields */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>FULL NAME</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(t) => setFormData({ ...formData, name: t })}
                            placeholder="John Doe"
                            placeholderTextColor={THEME.placeholder}
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
                            />
                        </View>
                    </View>

                    <View style={[styles.fieldContainer, { zIndex: 100, elevation: 100 }]}>
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
                                    // Prioritize specific suburb names (Neighborhood > Suburb > City)
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
                            onFail={(error) => {
                                console.error("Google Maps Error:", error);
                            }}
                            styles={{
                                textInput: styles.input,
                                listView: { position: 'absolute', top: 60, width: '100%', backgroundColor: 'white', borderRadius: 10, elevation: 101, zIndex: 101 },
                            }}
                            enablePoweredByContainer={false}
                            textInputProps={{
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
                        />
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>HOW URGENTLY DO YOU NEED THIS?</Text>
                        <View style={styles.urgencyContainer}>
                            <TouchableOpacity
                                style={[styles.urgencyButton, urgency === 'urgent' && styles.urgencyButtonActive]}
                                onPress={() => setUrgency('urgent')}>
                                <Text style={[styles.urgencyButtonText, urgency === 'urgent' && styles.urgencyButtonTextActive]}>Need service urgently</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.urgencyButton, urgency === 'standard' && styles.urgencyButtonActive]}
                                onPress={() => setUrgency('standard')}>
<<<<<<< HEAD
                                <Text style={[styles.urgencyButtonText, urgency === 'standard' && styles.urgencyButtonTextActive]}>Service not needed urgently</Text>
=======
                                <Text style={[styles.urgencyButtonText, urgency === 'standard' && styles.urgencyButtonTextActive]}>Not Urgent</Text>
>>>>>>> 6ea35de (feat: Secure API keys and fix module resolution)
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.urgencyButton, urgency === 'comparing' && styles.urgencyButtonActive]}
                                onPress={() => setUrgency('comparing')}>
<<<<<<< HEAD
                                <Text style={[styles.urgencyButtonText, urgency === 'comparing' && styles.urgencyButtonTextActive]}>Just comparing quotes</Text>
=======
                                <Text style={[styles.urgencyButtonText, urgency === 'comparing' && styles.urgencyButtonTextActive]}>Comparing Quotes</Text>
>>>>>>> 6ea35de (feat: Secure API keys and fix module resolution)
                            </TouchableOpacity>
                        </View>
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

                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>ISSUE DESCRIPTION</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.issue}
                            onChangeText={(t) => setFormData({ ...formData, issue: t })}
                            multiline
                            numberOfLines={4}
                            placeholder="Describe your issue..."
                            placeholderTextColor={THEME.placeholder}
                        />
                    </View>

                    {/* Legal */}
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

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Footer Button */}
                <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.disabledButton]}
                        onPress={handleFinalSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={THEME.navy} />
                        ) : (
                            <Text style={styles.submitButtonText}>SUBMIT PRIVATE REQUEST</Text>
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
    headerTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: THEME.navy,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    content: {
        padding: 20,
    },
    fieldContainer: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
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
    urgencyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    urgencyButton: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 16,
        backgroundColor: THEME.gray,
        alignItems: 'center',
    },
    urgencyButtonActive: {
        backgroundColor: THEME.navy,
    },
    urgencyButtonText: {
        fontWeight: 'bold',
        color: THEME.navy,
        fontSize: 10,
    },
    urgencyButtonTextActive: {
        color: THEME.white,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
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
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadText: {
        marginTop: 8,
        fontSize: 12,
        color: THEME.placeholder,
        fontWeight: '600',
    },
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
    legalContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F0F9FF',
        padding: 16,
        borderRadius: 16,
        marginTop: 10,
    },
    checkbox: {
        marginRight: 12,
        marginTop: -2,
    },
    legalText: {
        flex: 1,
        fontSize: 11,
        color: THEME.navy,
        lineHeight: 16,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1, borderTopColor: THEME.gray,
        backgroundColor: THEME.white,
    },
    submitButton: {
        backgroundColor: THEME.gold,
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: THEME.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    disabledButton: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: THEME.navy,
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
