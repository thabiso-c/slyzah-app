# Slyzah Ecosystem: Technical Stack
1. Universal Foundations
Primary Language: TypeScript (Strict type safety enforced across all platforms).

Design Language: Corporate Navy (#001C3D) and Polished Gold (#D4AF37).

Backend-as-a-Service: Google Firebase (Auth, Firestore, Cloud Functions, Storage).

2. Platform-Specific Frameworks
Slyzah-Web (Marketplace & Admin)
Framework: Next.js (App Router).

Rendering: SSR for SEO-optimized landing pages; CSR for high-density Admin dashboards.

Styling: Tailwind CSS + Framer Motion (Glass-premium aesthetics).

Hosting: Vercel (Edge-optimized).

Slyzah-App (Consumer) & Slyzah-Pro (Business)
Framework: React Native via Expo SDK.

Routing: Expo Router (File-based navigation).

Build Tooling: EAS (Expo Application Services) for Android/iOS previews and production.

3. Database & Messaging Architecture
Cloud Firestore (NoSQL)
users: Client and internal staff profiles.

professionals: Vendor profiles, verification status, and Tier-based metadata.

leads: Centralized quote requests and matching state machine (open, assigned, reviewed).

chats: Real-time messaging initialized only upon winner selection; ID format: ${leadId}_${vendorId}.

notifications: Sub-collection located at professionals/{vendorId}/notifications for vendor-specific alerts.

Messaging & Social Proof
Reputation Engine: Automated recalculation of finalRating and reviewCount triggered by new reviews collection entries.

System Messages: Use lastSenderId: "system" for automated handshake and status update notifications.

4. Specialized Integrations
Payments: PayFast (Processing ZAR subscriptions and the R5.00 setup fee for trials).

Geolocation: Google Maps Platform (Places API for suburb-to-region mapping using LOCATION_MAPPING).

Notifications: The "Triple-Threat" Flow: Simultaneous dispatch via Firestore notifications sub-collection, Expo Push Notifications (FCM/APNS), and Transactional Email.

Verification: Custom OCR logic for CIPC document scanning and trade certificate validation.

Communication: Resend API for high-deliverability transactional emails.