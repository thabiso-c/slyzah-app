1. South African Compliance & Localization
Currency Formatting: All financial displays must use the ZAR currency code or R symbol (e.g., R5.00 for setup fees).

POPIA Compliance: Since the platform handles vendor IDs and trade certificates, all data fetching must respect user privacy and verification status.

Regional Mapping: Any new feature involving location must utilize the LOCATION_MAPPING constant to ensure suburbs in the Western Seaboard (like Parklands) are correctly categorized into their respective tiers.

2. UI Component Library (The "Slyzah Look")
The Glass Card: Use the glass-premium tailwind class for all vendor listing cards to maintain a high-end feel.

Status Badges:

Verified: gold-500 with a checkmark icon.

Trial/Special: purple-600.

Urgent Lead: red-500.

Border Radius: Standardize on rounded-4xl (40px) for main containers and modals to match the modern app aesthetic.

3. Data Handling & Firestore Patterns
Atomic Updates: When a review is submitted, the system must trigger a recalculation of the finalRating rather than a simple increment to ensure data integrity.

Handshake Protocol: Developers must ensure that the lastSenderId: "system" is used for all automated chat triggers so that the "Unread" message count remains accurate for the human users.

Notification Dispatch: Any new lead-related function must implement the "Triple-Threat" flow: update the Firestore sub-collection, trigger the Expo Push, and send the Resend email.

4. Git & Workflow
Cross-Repo Checks: Before merging changes to the leads schema in Slyzah-Web, the developer must verify compatibility with the Slyzah-Pro and Slyzah-App React Native codebases.

Feature Flags: Keep "Premium Tier" features hidden behind a "Coming Soon" flag until the national billing logic is finalized.