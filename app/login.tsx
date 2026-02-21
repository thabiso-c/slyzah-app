import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithCredential,
    signInWithEmailAndPassword,
    signOut,
    User
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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
// Import the centralized auth instance
import { auth, db } from '../firebaseConfig';

// This is necessary for the auth session to work correctly on web and mobile.
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

const THEME = {
    navy: '#001f3f',
    gold: '#FFD700',
    white: '#FFFFFF',
    gray: '#F3F4F6',
    placeholder: '#9CA3AF',
};

export default function LoginScreen() {
    // Note: We don't need { navigation } prop here because we use router in _layout.tsx 
    // to handle the redirect based on auth state.

    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Google Auth Hook
    const [request, response, promptAsync] = Google.useAuthRequest({
        // Replace with your actual client IDs from Google Cloud Console
        iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
        androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
            // The _layout.tsx handles navigation, we just stop loading here
            setInitializing(false);
        });
        return unsubscribe;
    }, []);

    // Handle Google Auth Response
    useEffect(() => {
        if (response?.type === 'success') {
            setLoading(true); // Show loading indicator
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);
            signInWithCredential(auth, credential)
                .then(async (userCredential) => {
                    // Check Role for Google Login
                    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
                    if (userDoc.exists() && userDoc.data()?.role === 'vendor') {
                        await signOut(auth);
                        Alert.alert("Access Denied", "Vendor accounts cannot log into the Client app. Please register a new client account.");
                    }
                })
                .catch(error => {
                    Alert.alert("Login Error", "There was an issue signing in with Google.");
                    console.error(error);
                }).finally(() => setLoading(false));
        }
    }, []);

    const handleAuthAction = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }

        if (isRegistering) {
            if (!firstName || !surname) {
                Alert.alert('Error', 'Please enter your first name and surname.');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match.');
                return;
            }

            // Password Strength Validation
            const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(password)) {
                Alert.alert('Weak Password', 'Password must be at least 8 characters long and contain at least one uppercase letter and one number.');
                return;
            }
        }

        setLoading(true);
        try {
            if (isRegistering) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Create User Document in Firestore
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    firstName,
                    surname,
                    email,
                    role: 'client',
                    hasAcceptedTerms: false,
                    createdAt: serverTimestamp()
                });
                // Navigate to Terms screen
                router.replace('/terms');
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                // Check Role for Email Login
                const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
                if (userDoc.exists() && userDoc.data()?.role === 'vendor') {
                    await signOut(auth);
                    Alert.alert("Access Denied", "Vendor accounts cannot log into the Client app. Please register a new client account.");
                    return;
                }
                // _layout.tsx handles redirect for login
            }
        } catch (error: any) {
            setLoading(false);
            let msg = error.message;
            if (error.code === 'auth/invalid-email') msg = 'Invalid email address.';
            if (error.code === 'auth/user-not-found') msg = 'No user found with this email.';
            if (error.code === 'auth/wrong-password') msg = 'Incorrect password.';
            if (error.code === 'auth/email-already-in-use') msg = 'Email already in use.';
            Alert.alert('Authentication Error', msg);
        }
    };

    const handleForgotPassword = () => {
        router.push('/forgot-password');
    };

    if (initializing) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={THEME.gold} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.backgroundImageContainer}>
                <Image
                    source={require('../assets/logo6.png')}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                />
                <View style={styles.overlay} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerContainer}>
                        <View style={styles.logoWrapper}>
                            <Image
                                source={require('../assets/logo6.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.brandTitle}>SLYZAH</Text>
                        <Text style={styles.subTitle}>
                            {isRegistering ? 'Create Account' : 'Welcome Back'}
                        </Text>
                    </View>

                    <View style={styles.formContainer}>
                        {isRegistering && (
                            <>
                                <TextInput
                                    style={styles.input}
                                    placeholder="First Name"
                                    placeholderTextColor={THEME.placeholder}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Surname"
                                    placeholderTextColor={THEME.placeholder}
                                    value={surname}
                                    onChangeText={setSurname}
                                />
                            </>
                        )}
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor={THEME.placeholder}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={THEME.placeholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        {!isRegistering && (
                            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordButton}>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        )}

                        {isRegistering && (
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm Password"
                                placeholderTextColor={THEME.placeholder}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
                        )}

                        <TouchableOpacity
                            style={styles.mainButton}
                            onPress={handleAuthAction}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={THEME.navy} />
                            ) : (
                                <Text style={styles.mainButtonText}>
                                    {isRegistering ? 'REGISTER' : 'LOGIN'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setIsRegistering(!isRegistering)}
                            style={styles.toggleButton}
                        >
                            <Text style={styles.toggleText}>
                                {isRegistering ? "Already have an account? " : "Don't have an account? "}
                                <Text style={{ color: THEME.gold }}>
                                    {isRegistering ? "Login" : "Register"}
                                </Text>
                            </Text>
                        </TouchableOpacity>

                        {/* --- Social Login Separator --- */}
                        <View style={styles.separatorContainer}>
                            <View style={styles.separatorLine} />
                            <Text style={styles.separatorText}>OR</Text>
                            <View style={styles.separatorLine} />
                        </View>

                        {/* --- Google Login Button --- */}
                        <TouchableOpacity
                            style={[styles.socialButton, styles.googleButton]}
                            disabled={!request || loading}
                            onPress={() => {
                                promptAsync();
                            }}
                        >
                            <Image source={require('../assets/google-logo.png')} style={styles.socialIcon} />
                            <Text style={[styles.socialButtonText, styles.googleButtonText]}>
                                Sign in with Google
                            </Text>
                        </TouchableOpacity>

                        {/* --- Facebook Login Button (Placeholder) --- */}
                        <TouchableOpacity
                            style={[styles.socialButton, styles.facebookButton]}
                            onPress={() => Alert.alert("Coming Soon", "Facebook login will be available soon.")}
                        >
                            <Image source={require('../assets/facebook-logo.png')} style={styles.socialIcon} />
                            <Text style={styles.socialButtonText}>Sign in with Facebook</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.navy,
    },
    backgroundImageContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    backgroundImage: {
        width: width,
        height: height,
        opacity: 0.1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: THEME.navy,
        opacity: 0.8,
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoWrapper: {
        width: 80,
        height: 80,
        marginBottom: 16,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    brandTitle: {
        fontSize: 42,
        fontWeight: '900',
        color: THEME.gold,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 8,
    },
    subTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: THEME.white,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.8,
    },
    formContainer: {
        width: '100%',
        gap: 16,
    },
    input: {
        backgroundColor: THEME.gray,
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 20,
        fontSize: 16,
        fontWeight: '600',
        color: THEME.navy,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        paddingVertical: 4,
        marginTop: -8,
    },
    forgotPasswordText: {
        color: THEME.gold,
        fontSize: 12,
        fontWeight: '700',
    },
    mainButton: {
        backgroundColor: THEME.gold,
        borderRadius: 30,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    mainButtonText: {
        color: THEME.navy,
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    toggleButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    toggleText: {
        color: THEME.white,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.7,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    separatorText: {
        width: 50,
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: 'bold',
        fontSize: 12,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 30,
        paddingVertical: 16,
        width: '100%',
        gap: 12,
    },
    googleButton: {
        backgroundColor: THEME.white,
    },
    facebookButton: {
        backgroundColor: '#1877F2', // Official Facebook Blue
    },
    socialIcon: {
        width: 24,
        height: 24,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '900',
        color: THEME.white,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    googleButtonText: {
        color: '#5f6368', // Google's standard text color
    },
});
