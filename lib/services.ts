const WEB_API_BASE_URL = process.env.EXPO_PUBLIC_WEB_API_URL || "https://slyzah.co.za";

export const sendResendEmail = async (
  to: string,
  vendorName: string,
  customerName: string,
  category: string,
  issue: string,
  address: string,
  town: string,
  leadId: string,
  vendorId: string,
  imageUrl?: string,
  urgency?: string,
  replyTo?: string
) => {
  try {
    await fetch(`${WEB_API_BASE_URL}/api/send-lead-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        vendorName,
        customerName,
        category,
        issue,
        address,
        town,
        leadId,
        vendorId,
        imageUrl,
        urgency,
        replyTo,
      }),
    });
    console.log('Lead email sent via server');
  } catch (error) {
    console.error('Lead Email Error:', error);
  }
};

export const sendAwardEmail = async (
  to: string,
  vendorName: string,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  address: string,
  category: string
) => {
  try {
    await fetch(`${WEB_API_BASE_URL}/api/send-award-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        vendorName,
        customerName,
        customerPhone,
        customerEmail,
        address,
        category,
      }),
    });
    console.log('Award email sent via server');
  } catch (error) {
    console.error('Award Email Error:', error);
  }
};

export const sendBetaInviteEmail = async (to: string, vendorName: string) => {
  try {
    await fetch(`${WEB_API_BASE_URL}/api/send-beta-invite-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, vendorName }),
    });
    console.log('Beta invite email sent via server');
  } catch (error) {
    console.error('Beta Invite Email Error:', error);
  }
};
