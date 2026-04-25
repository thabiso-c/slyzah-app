/**
 * API Client for Slyzah Mobile App
 * 
 * SECURITY NOTE: 
 * React Native apps cannot host secure /api/ routes. 
 * We must call the deployed Web App's API to keep the VerifyNow API Key secure on the server.
 */

// This matches the URL found in your login.tsx
const WEB_API_BASE_URL = "https://slyzah-web.vercel.app";

export const verifyCipcBusiness = async (registrationNumber: string) => {
    try {
        const response = await fetch(`${WEB_API_BASE_URL}/api/verify-cipc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ registrationNumber }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Verification failed");
        }

        return data; // Returns { enterpriseName: "...", ... }
    } catch (error: any) {
        console.error("CIPC Verification Error:", error);
        throw error;
    }
};

/**
 * Dispatches push notification through the centralized Slyzah Server API.
 */
export const sendPushNotification = async (expoPushToken: string, title: string, body: string, data: any) => {
    try {
        await fetch(`${WEB_API_BASE_URL}/api/admin/notifications/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: expoPushToken,
                title,
                body,
                data,
                channelId: 'slyzah_alert'
            }),
        });
    } catch (error) {
        console.error("Centralized Notification API Error:", error);
    }
};