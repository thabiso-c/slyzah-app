import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore'; // Changed updateDoc to setDoc
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { useAssets } from 'expo-asset';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

const THEME = {
    navy: '#001f3f',
    gold: '#FFD700',
    white: '#FFFFFF',
    gray: '#F3F4F6',
    textGray: '#4B5563',
    disabled: '#9CA3AF',
};

export default function TermsScreen() {
    const router = useRouter();
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
    const [loading, setLoading] = useState(false);
    const [assets] = useAssets([require('../assets/Golden_Man_Compares_Pages_Runs.mp4')]);

    // Detect when user hits the bottom of the ScrollView
    const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const paddingToBottom = 50; // Increased threshold for easier trigger
        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            setIsScrolledToBottom(true);
        }
    };

    const handleAccept = async () => {
        if (!isScrolledToBottom) return;

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (user) {
                // setDoc with merge: true creates the doc if it doesn't exist
                // This fixes your "No document to update" error
                await setDoc(doc(db, "users", user.uid), {
                    hasAcceptedTerms: true,
                    role: 'client', // Automatically ensures they have a role
                    updatedAt: new Date()
                }, { merge: true });

                router.replace('/');
            } else {
                Alert.alert("Session Error", "Please login again.");
                router.replace('/login');
            }
        } catch (error) {
            console.error("Terms Acceptance Error:", error);
            Alert.alert("Error", "Could not save your acceptance. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>{title}</Text>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );

    const Paragraph = ({ children }: { children: React.ReactNode }) => (
        <Text style={styles.paragraph}>{children}</Text>
    );

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
                />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 31, 63, 0.85)' }]} />

            {/* Header with Integrated Logout */}
            <SafeAreaView style={styles.header}>
                <Text style={styles.headerTitle}>LEGAL & POLICIES</Text>
                <Text style={styles.headerSubtitle}>Please read carefully to continue</Text>
            </SafeAreaView>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                <Section title="1. Terms & Conditions">
                    <Paragraph>
                        By accessing and using Slyzah, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our platform. These terms constitute a legally binding agreement between you and Slyzah (Pty) Ltd.
                    </Paragraph>
                    <Paragraph>
                        Slyzah acts as an intermediary platform connecting users with independent service professionals. We do not directly provide the services offered by vendors.
                    </Paragraph>
                </Section>

                <Section title="2. Regulations & Laws (POPI & CPA)">
                    <Paragraph>
                        <Text style={{ fontWeight: 'bold' }}>POPI Act Compliance:</Text> We are committed to protecting your personal information in accordance with the Protection of Personal Information Act (POPIA).
                    </Paragraph>
                    <Paragraph>
                        <Text style={{ fontWeight: 'bold' }}>Consumer Protection Act (CPA):</Text> Users retain all rights afforded to them under the CPA regarding the quality of services rendered.
                    </Paragraph>
                </Section>

                <Section title="3. Refund & Return Policy">
                    <Paragraph>
                        As Slyzah is a connection platform, payments for services are typically made directly to the service professional. Refunds must be negotiated directly with the vendor.
                    </Paragraph>
                </Section>

                <Section title="4. Privacy Policy">
                    <Paragraph>
                        We collect information such as your name, contact details, and location to connect you with relevant professionals.
                    </Paragraph>
                </Section>

                <Section title="5. Delivery & Cancellation">
                    <Paragraph>
                        You may cancel a service request at any time before the professional is dispatched. Late cancellations may incur a fee.
                    </Paragraph>
                </Section>

                <Section title="6. About Us">
                    <Paragraph>
                        {"Slyzah (Pty) Ltd is South Africa's premier on-demand service marketplace. Our mission is to empower local professionals while providing homeowners with reliable service solutions."}
                    </Paragraph>
                </Section>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Sticky Bottom Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.button,
                        isScrolledToBottom ? styles.buttonActive : styles.buttonDisabled
                    ]}
                    onPress={handleAccept}
                    disabled={!isScrolledToBottom || loading}
                >
                    {loading ? (
                        <ActivityIndicator color={THEME.navy} />
                    ) : (
                        <Text style={[
                            styles.buttonText,
                            isScrolledToBottom ? styles.buttonTextActive : styles.buttonTextDisabled
                        ]}>
                            {isScrolledToBottom ? "I ACCEPT ALL TERMS" : "SCROLL TO END"}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.navy,
    },
    header: {
        paddingTop: 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: THEME.gold,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    headerSubtitle: {
        fontSize: 12,
        color: THEME.white,
        opacity: 0.5,
        marginTop: 5,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '900',
        color: THEME.gold,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionContent: {
        gap: 12,
    },
    paragraph: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        lineHeight: 22,
    },
    footer: {
        padding: 24,
        backgroundColor: 'rgba(0, 31, 63, 0.9)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    button: {
        paddingVertical: 20,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonActive: {
        backgroundColor: THEME.gold,
        shadowColor: THEME.gold,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    buttonTextActive: {
        color: THEME.navy,
    },
    buttonTextDisabled: {
        color: 'rgba(255, 255, 255, 0.2)',
    },
});
