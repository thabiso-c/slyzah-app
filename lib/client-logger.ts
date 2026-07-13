import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export async function logErrorTicket(
    error: any,
    context: string,
    user?: { uid?: string; email?: string; name?: string },
    priority: "high" | "critical" = "high"
) {
    try {
        console.error(`Error in ${context}:`, error);

        const errorData = {
            userId: user?.uid || "anonymous",
            userEmail: user?.email || "anonymous",
            userName: user?.name || "System",
            code: context,
            message: error?.message || "Unknown error occurred",
            stack: error?.stack,
            context: JSON.stringify({
                timestamp: new Date().toISOString(),
                platform: 'consumer-app',
                ...error
            }),
            status: "open",
            priority: priority,
            source: "consumer_app",
            createdAt: serverTimestamp(),
        };

        // 1. Write to system_errors for the new Admin Console
        await addDoc(collection(db, "system_errors"), errorData);

        // 2. Keep a record in support_tickets for historical tracking
        await addDoc(collection(db, "support_tickets"), {
            ...errorData,
            title: `System Error: ${context}`,
            type: "system_error",
        });

    } catch (loggingError) {
        console.error("Failed to log error ticket:", loggingError);
    }
}
