import { db } from '@/lib/firebase-admin'; // Ensure you have firebase-admin setup
import { NextResponse } from 'next/server';

/**
 * Webhook handler for incoming emails.
 * This endpoint should be configured in your email provider (e.g., Resend Inbound).
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json();

        // The payload format depends on your provider (Resend, SendGrid, etc.)
        // This example assumes a standard structure
        const { from, subject, text, html, to } = payload;

        // 1. Identify the sender (check if they are an existing vendor or client)
        const senderEmail = from.toLowerCase();

        // 2. Save to Firestore for the Admin Dashboard
        await db.collection('admin_inbox').add({
            from: senderEmail,
            to: to,
            subject: subject || '(No Subject)',
            content: text || html,
            receivedAt: new Date(),
            status: 'new', // unread/pending
            priority: 'medium',
            metadata: {
                source: 'inbound-email'
            }
        });

        return NextResponse.json({ message: 'Email processed and routed to dashboard' }, { status: 200 });
    } catch (error: any) {
        console.error('Inbound Email Error:', error);
        return NextResponse.json({ error: 'Failed to process email' }, { status: 500 });
    }
}