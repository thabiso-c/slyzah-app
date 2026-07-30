/**
 * Web Vendor Utilities for Slyzah Mobile App
 * 
 * This module extends the mobile app to support web-sourced vendors
 * by leveraging the existing slyzah.co.za API endpoints.
 */

export interface WebVendor {
    id: string;
    name: string;
    rating?: number;
    reviewCount?: number;
    description?: string;
    address?: string;
    phone?: string;
    website?: string;
    email?: string;
    mapsUrl: string;
    source: "web";
    emailFound: boolean;
    reviews?: Array<{
        authorName: string;
        rating: number;
        comment: string;
        timeDescription?: string;
        time?: number;
    }>;
}

export interface WebVendorSearchParams {
    category: string;
    location: string;
    province?: string;
}

export interface WebVendorOutreachParams {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    category: string;
    issue: string;
    address: string;
    town: string;
    urgency: "urgent" | "standard" | "comparing";
    imageUrl?: string;
    externalVendors: Array<{
        id: string;
        name: string;
        email?: string;
        website?: string;
        phone?: string;
        address?: string;
    }>;
}

/**
 * Search for web vendors using the Slyzah web API
 * This mirrors the functionality in slyzah-web/app/api/search-web-vendors/route.ts
 */
export async function searchWebVendors(
    params: WebVendorSearchParams
): Promise<WebVendor[]> {
    try {
        const { category, location, province } = params;
        const locationStr = province
            ? `${location}, ${province}`
            : location || "South Africa";

        const queryParams = new URLSearchParams({
            category,
            location: locationStr,
        });

        const response = await fetch(
            `https://slyzah.co.za/api/search-web-vendors?${queryParams.toString()}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[WebVendor] Search failed:', errorData);
            return [];
        }

        const data = await response.json();
        return data.vendors || [];
    } catch (error) {
        console.error('[WebVendor] Search error:', error);
        return [];
    }
}

/**
 * Send outreach emails to web vendors using the Slyzah web API
 * This mirrors the functionality in slyzah-web/app/api/send-outreach-email/route.ts
 * 
 * Note: Web vendors do NOT receive push notifications because:
 * 1. They are not registered Slyzah Pro users
 * 2. They don't have Expo push tokens
 * 3. They only receive email notifications
 */
export async function sendWebVendorOutreach(
    params: WebVendorOutreachParams
): Promise<{ success: boolean; leadId?: string; emailResults?: any[]; error?: string }> {
    try {
        const response = await fetch('https://slyzah.co.za/api/send-outreach-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...params,
                customerId: undefined, // Web vendor outreach doesn't require customer auth
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data?.error || 'Failed to send outreach emails',
            };
        }

        return {
            success: true,
            leadId: data.leadId,
            emailResults: data.emailResults,
        };
    } catch (error: any) {
        console.error('[WebVendor] Outreach error:', error);
        return {
            success: false,
            error: error.message || 'Network error occurred',
        };
    }
}

/**
 * Check if the web vendor API is available
 * Useful for feature flagging in the mobile app
 */
export async function checkWebVendorApiAvailability(): Promise<boolean> {
    try {
        const response = await fetch(
            'https://slyzah.co.za/api/search-web-vendors?category=test&location=test',
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        // API is available even if it returns an error (means endpoint exists)
        return response.status !== 404;
    } catch (error) {
        return false;
    }
}