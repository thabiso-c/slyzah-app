import { RESEND_API_KEY } from './secrets';

export const sendResendEmail = async (to: string, vendorName: string, customerName: string, category: string, issue: string, address: string, town: string, leadId: string, vendorId: string, imageUrl?: string, urgency?: string) => {
    try {
        // Corrected Vercel link based on user feedback
        const webReplyLink = `https://slyzah-web.vercel.app/submit-quote?leadId=${leadId}&vendorId=${vendorId}`;

        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Slyzah Official <noreply@slyzah.co.za>',
                to: [to], // Ensure 'to' is an array
                subject: `🚨 [Job Alert] New Request: ${category}`,
                headers: {
                    "X-Entity-Ref-ID": leadId,
                },
                html: `
                    <div style="background-color: #f4f7f9; padding: 40px 0; font-family: sans-serif;">
                      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <tr><td style="background-color: #001f3f; padding: 12px; text-align: center;"><span style="color: #ffffff; font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Slyzah Official</span></td></tr>
                        <tr>
                          <td style="padding: 40px;">
                            <h2 style="color: #001f3f; margin: 0 0 20px 0; font-size: 24px;">Submit Your Quote</h2>
                            <p style="color: #333; font-size: 16px;">Hi <strong>${vendorName}</strong>,</p>
                            <p style="color: #555; font-size: 15px;">A customer has requested a quote for <strong>${category}</strong>.</p>                            
                            <div style="background-color: #f9f9f9; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #eee;">
                                <table width="100%" style="font-size: 14px; line-height: 1.8;">
                                    <tr><td width="35%" style="font-weight: bold;">Urgency:</td><td style="font-weight: bold; color: ${urgency === 'urgent' ? '#D32F2F' : urgency === 'standard' ? '#388E3C' : '#666'};">
                                        ${urgency === 'urgent' ? 'Need service urgently' :
                        urgency === 'standard' ? 'Service not needed urgently' :
                            'Just comparing quotes'
                    }
                                    </td></tr>
                                    <tr><td width="35%" style="font-weight: bold;">Location:</td><td>${address}</td></tr>
                                    <tr><td style="font-weight: bold;">Area:</td><td>${town}</td></tr>
                                    <tr><td style="font-weight: bold;">Description:</td><td>${issue}</td></tr>
                                </table>
                                ${imageUrl ? `<div style="margin-top: 15px; text-align: center;"><img src="${imageUrl}" style="max-width: 100%; border-radius: 8px; border: 1px solid #ddd;" alt="Attached Image" /></div>` : ''}
                            </div>
                            <div style="text-align: center; margin-top: 30px;">
                              <a href="${webReplyLink}" style="background-color: #BF953F; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Open Quote Form</a>
                            </div>
                          </td>
                        </tr>
                        <tr><td style="padding: 20px; text-align: center; color: #aaa; font-size: 11px;">© 2025 Slyzah. Connecting local pros.</td></tr>
                      </table>
                    </div>
                `
            })
        });
        console.log('Resend email sent successfully');
    } catch (error) {
        console.error('Resend Error:', error);
    }
};

export const sendPushNotification = async (expoPushToken: string, title: string, body: string, data: any) => {
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

export const sendAwardEmail = async (to: string, vendorName: string, customerName: string, customerPhone: string, customerEmail: string, address: string, category: string) => {
    try {
        console.log(`Sending award email to ${to} via Resend...`);
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
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

