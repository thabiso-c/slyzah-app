import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { useAssets } from 'expo-asset';
import { auth } from '../firebaseConfig';

const THEME = {
    navy: '#001f3f',
    gold: '#FFD700',
    white: '#FFFFFF',
    gray: '#F3F4F6',
};

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [assets] = useAssets([require('../assets/Golden_Man_Compares_Pages_Runs.mp4')]);

    const handleReset = async () => {
        const cleanEmail = email.trim();
        if (!cleanEmail) {
            Alert.alert("Error", "Please enter your email address.");
            return;
        }
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, cleanEmail);
            setResetSent(true);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                Alert.alert("Account Not Found", "No account found with this email.");
            } else {
                Alert.alert("Error", error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (resetSent) {
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
                <View style={styles.content}>
                    <View style={styles.solidContainer}>
                        <View style={styles.successIcon}>
                            <Text style={{ fontSize: 40 }}>📨</Text>
                        </View>
                        <Text style={[styles.title, { textAlign: 'center' }]}>Check your inbox</Text>
                        <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                            {"We've sent a password reset link to"}{"\n"}
                            <Text style={{ color: THEME.gold, fontWeight: 'bold' }}>{email}</Text>
                        </Text>

                        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
                            <Text style={styles.buttonText}>BACK TO LOGIN</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

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

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={THEME.white} />
                </TouchableOpacity>

                <View style={styles.content}>
                    <View style={styles.solidContainer}>
                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>Enter your email to receive a reset link.</Text>

                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="client@example.com"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color={THEME.navy} />
                            ) : (
                                <Text style={styles.buttonText}>SEND RESET LINK</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.navy },
    backButton: { marginTop: 60, marginLeft: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, justifyContent: 'center', padding: 20 },
    solidContainer: {
        backgroundColor: THEME.navy,
        borderRadius: 32,
        padding: 30,
        borderWidth: 1,
        borderColor: THEME.gold,
    },
    title: { fontSize: 28, fontWeight: '900', color: THEME.white, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 30, lineHeight: 20 },
    label: { color: THEME.gold, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10, marginLeft: 4, letterSpacing: 1 },
    input: {
        backgroundColor: '#0B2A4A',
        borderRadius: 20,
        padding: 18,
        color: THEME.white,
        fontSize: 16,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: '#173A5E',
        marginBottom: 20,
    },
    button: { backgroundColor: THEME.gold, padding: 18, borderRadius: 25, alignItems: 'center', shadowColor: THEME.gold, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    buttonText: { color: THEME.navy, fontWeight: '900', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
    successIcon: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 20
    }
});
