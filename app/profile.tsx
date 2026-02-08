import { useRouter } from 'expo-router';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const THEME = {
    navy: '#001f3f',
    gold: '#FFD700',
    white: '#FFFFFF',
    gray: '#F3F4F6',
    placeholder: '#9CA3AF',
};

export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        surname: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setFormData({
                            firstName: data.firstName || currentUser.displayName?.split(' ')[0] || '',
                            surname: data.surname || currentUser.displayName?.split(' ')[1] || '',
                            phone: data.phone || '',
                            email: currentUser.email || ''
                        });
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error);
                }
            } else {
                router.replace('/login');
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            // 1. Update Firestore
            await updateDoc(doc(db, "users", user.uid), {
                firstName: formData.firstName,
                surname: formData.surname,
                phone: formData.phone,
                updatedAt: new Date()
            });

            // 2. Update Auth Profile (Display Name)
            const fullName = `${formData.firstName} ${formData.surname}`.trim();
            await updateProfile(user, { displayName: fullName });

            Alert.alert("Success", "Profile updated successfully!");
        } catch (error) {
            console.error("Update Error:", error);
            Alert.alert("Error", "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.replace('/login');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.gold} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>MY PROFILE</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : "U"}
                        </Text>
                    </View>
                    <Text style={styles.emailText}>{formData.email}</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>FIRST NAME</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.firstName}
                        onChangeText={(t) => setFormData({ ...formData, firstName: t })}
                    />

                    <Text style={styles.label}>SURNAME</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.surname}
                        onChangeText={(t) => setFormData({ ...formData, surname: t })}
                    />

                    <Text style={styles.label}>PHONE NUMBER</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.phone}
                        onChangeText={(t) => setFormData({ ...formData, phone: t })}
                        keyboardType="phone-pad"
                        placeholder="+27..."
                    />

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                        {saving ? <ActivityIndicator color={THEME.navy} /> : <Text style={styles.saveButtonText}>SAVE CHANGES</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutText}>LOGOUT</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.gray },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.navy },
    header: { backgroundColor: THEME.navy, padding: 20, alignItems: 'center' },
    headerTitle: { color: THEME.white, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
    content: { padding: 20 },
    avatarContainer: { alignItems: 'center', marginBottom: 30 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: THEME.navy, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    avatarText: { color: THEME.gold, fontSize: 32, fontWeight: '900' },
    emailText: { color: '#666', fontSize: 14, fontWeight: '600' },
    form: { backgroundColor: THEME.white, padding: 20, borderRadius: 20 },
    label: { fontSize: 10, fontWeight: '900', color: THEME.navy, marginBottom: 5, marginTop: 15 },
    input: { backgroundColor: THEME.gray, padding: 15, borderRadius: 12, fontSize: 14, fontWeight: '600', color: THEME.navy },
    saveButton: { backgroundColor: THEME.gold, padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 30 },
    saveButtonText: { color: THEME.navy, fontWeight: '900', fontSize: 12 },
    logoutButton: { marginTop: 20, alignItems: 'center', padding: 15 },
    logoutText: { color: 'red', fontWeight: '900', fontSize: 12 }
});