"use client";

import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from "firebase/auth";
import {
    addDoc,
    collection,
    doc, getDoc, getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

const THEME = {
    navy: '#001f3f',
    gold: '#FFD700',
    white: '#FFFFFF',
    gray: '#F3F4F6',
    placeholder: '#9CA3AF',
};

const sendAwardEmail = async (to: string, vendorName: string, customerName: string, customerPhone: string, customerEmail: string, address: string, category: string) => {
    try {
        console.log(`Sending award email to ${to} via Resend...`);
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer re_ie1miiFB_3ExUN5jDYkMFCqT98sqKL7vq',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Slyzah <noreply@slyzah.co.za>',
                to: [to],
                subject: `You Won! New Job: ${category}`,
                html: `
                    <div style="font-family: sans-serif; color: #001f3f; padding: 20px;">
                        <h2 style="color: #FFD700;">Congratulations ${vendorName}!</h2>
                        <p><strong>${customerName}</strong> has selected your quote for the <strong>${category}</strong> job.</p>
                        
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #001f3f;">Customer Details</h3>
                            <p><strong>Name:</strong> ${customerName}</p>
                            <p><strong>Phone:</strong> ${customerPhone}</p>
                            <p><strong>Email:</strong> ${customerEmail}</p>
                            <p><strong>Address:</strong> ${address}</p>
                        </div>

                        <p>Please contact the customer immediately to arrange the service.</p>
                    </div>
                `
            })
        });
    } catch (error) {
        console.error('Award Email Error:', error);
    }
};

const sendPushNotification = async (expoPushToken: string, title: string, body: string, data: any) => {
    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: expoPushToken,
                sound: 'default',
                title: title,
                body: body,
                data: data,
            }),
        });
    } catch (error) {
        console.error("Error sending push:", error);
    }
};

export default function UserDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"active" | "history" | "messages" | "support" | "reviews">("active");
    const [unreadCount, setUnreadCount] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const [showAlertsModal, setShowAlertsModal] = useState(false);

    // --- REJECTION MODAL STATES ---
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
    const [selectedWinnerName, setSelectedWinnerName] = useState("");

    // --- REVIEW STATES ---
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewData, setReviewData] = useState({ rating: 0, comment: "" });
    const [targetReview, setTargetReview] = useState<{ vendorId: string, vendorName: string, leadId: string } | null>(null);

    const [supportMessage, setSupportMessage] = useState("");

    // Audio is not directly supported in the same way as web in React Native without expo-av, 
    // and playing sound on background updates requires more setup. 
    // We will omit the audio ref for simplicity or use a simple alert/toast logic if needed.

    const pendingReviewsCount = leads.filter(l => l.winnerId && !l.hasReviewed).length;

    useEffect(() => {
        if (!loading && pendingReviewsCount > 0) {
            // Automatically slide tabs to show the Reviews tab (approximate position)
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ x: 200, animated: true });
            }, 1000);
        }
    }, [loading]);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 1. Fetch User's Leads
                const qLeads = query(
                    collection(db, "leads"),
                    where("customerId", "==", currentUser.uid),
                    orderBy("createdAt", "desc")
                );
                const unsubLeads = onSnapshot(qLeads, (snapshot) => {
                    setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false);
                });

                // 2. Fetch User's Chats
                const qChats = query(
                    collection(db, "chats"),
                    where("customerId", "==", currentUser.uid),
                    orderBy("updatedAt", "desc")
                );
                const unsubChats = onSnapshot(qChats, (snapshot) => {
                    const chatList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as any[];

                    // Check for new messages to trigger notification
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === "modified") {
                            const data = change.doc.data();
                            if (data.lastSenderId !== currentUser.uid && data.customerUnreadCount > 0) {
                                Notifications.scheduleNotificationAsync({
                                    content: {
                                        title: `New Message from ${data.vendorName || 'Pro'}`,
                                        body: data.lastMessage,
                                        sound: 'default',
                                        data: { chatId: data.id },
                                    },
                                    trigger: null,
                                });
                            }
                        }
                    });

                    const totalUnread = chatList.reduce((acc, chat) => acc + (chat.customerUnreadCount || 0), 0);
                    setUnreadCount(totalUnread);
                    setChats(chatList);
                });

                return () => { unsubLeads(); unsubChats(); };
            } else {
                // If not logged in, redirect is handled by _layout usually, but safe to keep
                setLoading(false);
            }
        });

        return () => unsubAuth();
    }, []);

    const initiateSelectWinner = (leadId: string, vendorId: string, vendorName: string) => {
        setSelectedLeadId(leadId);
        setSelectedWinnerId(vendorId);
        setSelectedWinnerName(vendorName);
        setShowRejectionModal(true);
    };

    const handleFinalizeSelection = async () => {
        if (!selectedLeadId || !selectedWinnerId || !user) return;

        const lead = leads.find(l => l.id === selectedLeadId);
        if (!lead) return;

        try {
            const chatId = `${selectedLeadId}_${selectedWinnerId}`;

            // 1. Update Lead Status
            await updateDoc(doc(db, "leads", selectedLeadId), {
                status: "assigned",
                winnerId: selectedWinnerId,
                rejectionFeedback: rejectionReason,
                assignedAt: serverTimestamp(),
                reviewEmailSent: false
            });

            // 2. Initialize Chat Document
            await setDoc(doc(db, "chats", chatId), {
                id: chatId,
                leadId: selectedLeadId,
                customerId: user.uid,
                vendorId: selectedWinnerId,
                vendorName: selectedWinnerName,
                customerName: user.displayName || "Customer",
                lastMessage: "Winner selected! You can now start chatting.",
                lastSenderId: "system",
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                customerUnreadCount: 1,
                vendorUnreadCount: 0,
            }, { merge: true });

            // 3. Notify Vendor
            await addDoc(collection(db, "professionals", selectedWinnerId, "notifications"), {
                type: "won",
                notificationMessage: `You won the lead! ${lead.customerName} selected you.`,
                status: "unread",
                createdAt: serverTimestamp(),
                leadId: selectedLeadId
            });

            // 4. Send Award Email to Vendor
            const winningQuote = lead.quotes?.[selectedWinnerId];
            let vendorEmail = winningQuote?.vendorEmail;

            // Fetch Vendor Profile for Email fallback AND Push Token
            if (selectedWinnerId) {
                const vendorSnap = await getDoc(doc(db, "professionals", selectedWinnerId));
                if (vendorSnap.exists()) {
                    const vData = vendorSnap.data();
                    if (!vendorEmail) vendorEmail = vData.email;

                    // Send Push Notification
                    if (vData.expoPushToken) {
                        await sendPushNotification(vData.expoPushToken, "You Won a Job! 🏆", `Customer selected you for: ${lead.category}`, { leadId: selectedLeadId });
                    }
                }
            }

            if (vendorEmail) {
                await sendAwardEmail(
                    vendorEmail,
                    selectedWinnerName,
                    lead.customerName,
                    lead.customerPhone,
                    lead.customerEmail,
                    `${lead.location || ''} ${lead.town || ''}`,
                    lead.category
                );
            }

            Alert.alert("Success", `Winner selected: ${selectedWinnerName}`);
            setShowRejectionModal(false);
            setRejectionReason("");
            setActiveTab("messages");

        } catch (error) {
            console.error("Selection Error:", error);
            Alert.alert("Error", "Failed to finalize selection.");
        }
    };

    const handleOpenChat = async (lead: any) => {
        const chatId = `${lead.id}_${lead.winnerId}`;
        // Navigate to Chat
        // Assuming you have a route like /chat/[id]
        router.push({ pathname: '/chat/[id]', params: { id: chatId } } as any);
    };

    const openReviewModal = (lead: any) => {
        const winningQuote = lead.quotes?.[lead.winnerId];
        setTargetReview({
            vendorId: lead.winnerId,
            vendorName: winningQuote?.vendorName || "Professional",
            leadId: lead.id
        });
        setReviewData({ rating: 0, comment: "" });
        setShowReviewModal(true);
    };

    const submitReview = async () => {
        if (!targetReview || reviewData.rating === 0) {
            Alert.alert("Error", "Please select a rating.");
            return;
        }

        const lead = leads.find(l => l.id === targetReview.leadId);
        const reviewerName = lead?.customerName || user.displayName || "Slyzah User";

        try {
            await addDoc(collection(db, "reviews"), {
                vendorId: targetReview.vendorId,
                comment: reviewData.comment,
                rating: reviewData.rating,
                customerName: reviewerName,
                createdAt: serverTimestamp(),
                leadId: targetReview.leadId
            });

            // Mark lead as reviewed
            await updateDoc(doc(db, "leads", targetReview.leadId), {
                hasReviewed: true
            });

            // Recalculate and Update Vendor Stats
            const reviewsQuery = query(collection(db, "reviews"), where("vendorId", "==", targetReview.vendorId));
            const querySnapshot = await getDocs(reviewsQuery);

            let totalScore = 0;
            let reviewCount = 0;

            querySnapshot.forEach((doc) => {
                const r = doc.data();
                if (r.rating) {
                    totalScore += Number(r.rating);
                    reviewCount++;
                }
            });

            const finalRating = reviewCount > 0 ? (totalScore / reviewCount) : 0;

            const vendorRef = doc(db, "professionals", targetReview.vendorId);
            await updateDoc(vendorRef, {
                rating: Number(finalRating.toFixed(1)),
                reviewCount: reviewCount
            });

            Alert.alert("Success", "Review submitted!");
            setShowReviewModal(false);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to submit review.");
        }
    };

    const handleSendSupport = async () => {
        if (!supportMessage.trim()) return;
        try {
            await addDoc(collection(db, "support_tickets"), {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || "User",
                message: supportMessage,
                status: "open",
                createdAt: serverTimestamp(),
                type: "user"
            });
            Alert.alert("Success", "Ticket Sent!");
            setSupportMessage("");
        } catch (error) {
            Alert.alert("Error", "Failed to send ticket.");
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.gold} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            {/* HEADER */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>MY SLYZAH DASHBOARD</Text>
                    <Text style={styles.headerSubtitle}>Slyzah Customer Portal</Text>
                </View>
                <TouchableOpacity style={styles.alertBadge} onPress={() => setShowAlertsModal(true)} disabled={unreadCount === 0}>
                    <Ionicons name="notifications" size={20} color={unreadCount > 0 ? THEME.gold : "#ccc"} />
                    <Text style={styles.alertText}>{unreadCount} New Alerts</Text>
                </TouchableOpacity>
            </View>

            {/* TABS */}
            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={scrollViewRef}>
                    <TabBtn active={activeTab === "active"} label="Active" icon="flash" onClick={() => setActiveTab("active")} />
                    <TabBtn active={activeTab === "history"} label="History" icon="time" onClick={() => setActiveTab("history")} />
                    <TabBtn active={activeTab === "messages"} label="Messages" icon="chatbubbles" badge={unreadCount} onClick={() => setActiveTab("messages")} />
                    <TabBtn active={activeTab === "reviews"} label="Reviews" icon="star" badge={pendingReviewsCount} onClick={() => setActiveTab("reviews")} />
                    <TabBtn active={activeTab === "support"} label="Support" icon="help-buoy" onClick={() => setActiveTab("support")} />
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 50 }]}>
                {/* MESSAGES TAB */}
                {activeTab === "messages" && (
                    <View>
                        {chats.length > 0 ? chats.map((chat) => (
                            <TouchableOpacity
                                key={chat.id}
                                style={[styles.card, chat.customerUnreadCount > 0 && styles.cardActive]}
                                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chat.id } } as any)}
                            >
                                <View style={styles.row}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{chat.vendorName?.charAt(0) || "P"}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.cardTitle}>{chat.vendorName}</Text>
                                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                                            {chat.lastSenderId === user?.uid ? "You: " : ""} {chat.lastMessage}
                                        </Text>
                                    </View>
                                    {chat.customerUnreadCount > 0 && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{chat.customerUnreadCount}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )) : (
                            <Text style={styles.emptyText}>No active conversations.</Text>
                        )}
                    </View>
                )}

                {/* ACTIVE & HISTORY LEADS */}
                {(activeTab === "active" || activeTab === "history") && (
                    <View>
                        {leads
                            .filter(l => activeTab === "active" ? l.status === "open" : l.status === "assigned")
                            .map((lead) => (
                                <View key={lead.id} style={styles.card}>
                                    <View style={styles.rowBetween}>
                                        <View style={styles.tag}>
                                            <Text style={styles.tagText}>{lead.category}</Text>
                                        </View>
                                        <Text style={styles.dateText}>
                                            {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString() : ''}
                                        </Text>
                                    </View>
                                    <Text style={styles.cardTitle}>{lead.issueDescription}</Text>
                                    <Text style={styles.cardSubtitle}>📍 {lead.region}</Text>

                                    {lead.status === "assigned" && (
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleOpenChat(lead)}
                                        >
                                            <Text style={styles.actionButtonText}>Open Project Chat</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Quotes Section */}
                                    <View style={styles.quotesSection}>
                                        <Text style={styles.sectionHeader}>Received Quotes</Text>
                                        {lead.quotes ? Object.entries(lead.quotes).map(([vId, quote]: [string, any]) => (
                                            <View key={vId} style={[styles.quoteItem, lead.winnerId === vId && styles.quoteWinner]}>
                                                <View style={styles.rowBetween}>
                                                    <Text style={styles.quoteVendor} numberOfLines={1}>{quote.vendorName || "Pro"}</Text>
                                                    <Text style={styles.quotePrice}>R{quote.amount}</Text>
                                                </View>
                                                {quote.message && (
                                                    <Text style={styles.quoteMessage}>"{quote.message}"</Text>
                                                )}
                                                {lead.status === "open" && (
                                                    <TouchableOpacity
                                                        style={styles.selectButton}
                                                        onPress={() => initiateSelectWinner(lead.id, vId, quote.vendorName)}
                                                    >
                                                        <Text style={styles.selectButtonText}>Select Winner</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )) : <Text style={styles.emptyText}>Waiting for quotes...</Text>}
                                    </View>
                                </View>
                            ))}
                    </View>
                )}

                {/* REVIEWS TAB */}
                {activeTab === "reviews" && (
                    <View>
                        {leads.filter(l => l.winnerId && !l.hasReviewed).map((lead) => {
                            const winningQuote = lead.quotes?.[lead.winnerId];
                            return (
                                <View key={lead.id} style={styles.card}>
                                    <Text style={styles.cardTitle}>{winningQuote?.vendorName || "Professional"}</Text>
                                    <Text style={styles.cardSubtitle}>Job: {lead.issueDescription}</Text>
                                    <TouchableOpacity style={styles.actionButton} onPress={() => openReviewModal(lead)}>
                                        <Text style={styles.actionButtonText}>Rate & Review</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                        {leads.filter(l => l.winnerId && !l.hasReviewed).length === 0 && (
                            <Text style={styles.emptyText}>No completed jobs to review.</Text>
                        )}
                    </View>
                )}

                {/* SUPPORT TAB */}
                {activeTab === "support" && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Contact Support</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Describe your issue..."
                            multiline
                            numberOfLines={5}
                            value={supportMessage}
                            onChangeText={setSupportMessage}
                        />
                        <TouchableOpacity style={styles.actionButton} onPress={handleSendSupport}>
                            <Text style={styles.actionButtonText}>Send Ticket</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* MODALS */}
            <Modal visible={showRejectionModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirm Winner</Text>
                        <Text style={styles.modalSubtitle}>Why were others not selected?</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Price too high, etc..."
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                        />
                        <TouchableOpacity style={styles.actionButton} onPress={handleFinalizeSelection}>
                            <Text style={styles.actionButtonText}>Confirm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowRejectionModal(false)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showReviewModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Rate {targetReview?.vendorName}</Text>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setReviewData({ ...reviewData, rating: star })}>
                                    <Ionicons name="star" size={32} color={reviewData.rating >= star ? THEME.gold : "#ccc"} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Write your review..."
                            value={reviewData.comment}
                            onChangeText={(t) => setReviewData({ ...reviewData, comment: t })}
                        />
                        <TouchableOpacity style={styles.actionButton} onPress={submitReview}>
                            <Text style={styles.actionButtonText}>Submit Review</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowReviewModal(false)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showAlertsModal} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAlertsModal(false)}>
                    <View style={[styles.modalContent, { position: 'absolute', top: 110, right: 20, width: 320 }]}>
                        <Text style={styles.modalTitle}>Notifications</Text>
                        <ScrollView>
                            {chats.filter(c => c.customerUnreadCount > 0).length > 0 ? (
                                chats.filter(c => c.customerUnreadCount > 0).map(chat => (
                                    <TouchableOpacity
                                        key={chat.id}
                                        style={styles.notificationItem}
                                        onPress={() => {
                                            setShowAlertsModal(false);
                                            router.push({ pathname: '/chat/[id]', params: { id: chat.id } } as any);
                                        }}
                                    >
                                        <View style={styles.row}>
                                            <View style={styles.avatar}>
                                                <Text style={styles.avatarText}>{chat.vendorName?.charAt(0) || "P"}</Text>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={styles.notificationTitle} numberOfLines={1}>New message from {chat.vendorName}</Text>
                                                <Text style={styles.cardSubtitle} numberOfLines={1}>{chat.lastMessage}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No new alerts.</Text>
                            )}
                        </ScrollView>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAlertsModal(false)}>
                            <Text style={styles.cancelButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

        </SafeAreaView>
    );
}

const TabBtn = ({ active, label, icon, onClick, badge }: any) => (
    <TouchableOpacity
        onPress={onClick}
        style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
        <Ionicons name={icon} size={16} color={active ? THEME.white : "#999"} />
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
        {badge > 0 && (
            <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{badge}</Text>
            </View>
        )}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.gray },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.navy },
    header: {
        backgroundColor: THEME.navy,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: { color: THEME.white, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
    headerSubtitle: { color: THEME.gold, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    alertBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 12 },
    alertText: { color: THEME.white, fontSize: 10, fontWeight: 'bold', marginLeft: 5, textTransform: 'uppercase' },
    tabsContainer: { paddingVertical: 15, paddingHorizontal: 10 },
    tabBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: THEME.white,
    },
    tabBtnActive: { backgroundColor: THEME.navy },
    tabText: { fontSize: 12, fontWeight: 'bold', color: '#999', marginLeft: 5, textTransform: 'uppercase' },
    tabTextActive: { color: THEME.white },
    tabBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
    tabBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    content: { padding: 15, paddingBottom: 50 },
    card: { backgroundColor: THEME.white, borderRadius: 20, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardActive: { borderColor: THEME.gold, borderWidth: 1 },
    cardTitle: { fontSize: 16, fontWeight: '900', color: THEME.navy, marginBottom: 5 },
    cardSubtitle: { fontSize: 12, color: '#666', marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.navy, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: THEME.gold, fontWeight: '900' },
    badge: { backgroundColor: THEME.gold, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: THEME.navy },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontStyle: 'italic' },
    tag: { backgroundColor: THEME.navy, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    tagText: { color: THEME.white, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    dateText: { fontSize: 10, color: '#999', fontWeight: 'bold' },
    actionButton: { backgroundColor: THEME.navy, padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    actionButtonText: { color: THEME.white, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12 },
    quotesSection: { marginTop: 15, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 12 },
    sectionHeader: { fontSize: 10, fontWeight: '900', color: '#999', textTransform: 'uppercase', marginBottom: 10 },
    quoteItem: { backgroundColor: THEME.white, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
    quoteWinner: { borderColor: THEME.gold, borderWidth: 2 },
    quoteVendor: { fontSize: 12, fontWeight: '900', color: THEME.navy, flex: 1, marginRight: 10 },
    quotePrice: { fontSize: 12, fontWeight: 'bold', color: THEME.gold },
    quoteMessage: { fontSize: 11, fontStyle: 'italic', color: '#666', marginVertical: 5 },
    selectButton: { backgroundColor: THEME.gold, padding: 8, borderRadius: 8, alignItems: 'center', marginTop: 5 },
    selectButtonText: { color: THEME.navy, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase' },
    textArea: { backgroundColor: '#f0f0f0', borderRadius: 12, padding: 10, height: 100, textAlignVertical: 'top', marginVertical: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: THEME.white, borderRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: THEME.navy, marginBottom: 5, textAlign: 'center' },
    modalSubtitle: { fontSize: 12, color: '#666', marginBottom: 15, textAlign: 'center' },
    cancelButton: { padding: 12, alignItems: 'center', marginTop: 5 },
    cancelButtonText: { color: '#999', fontWeight: 'bold' },
    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 15 },
    notificationItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: THEME.gray },
    notificationTitle: { fontSize: 14, fontWeight: 'bold', color: THEME.navy },
});
