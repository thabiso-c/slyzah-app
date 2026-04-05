import { RESEND_API_KEY } from './secrets';

export const sendResendEmail = async (to: string, vendorName: string, customerName: string, category: string, issue: string, address: string, town: string, leadId: string, vendorId: string, imageUrl?: string, urgency?: string, replyTo?: string) => {
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
                reply_to: replyTo,
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
                sound: 'slyzah_alert.mp3',
                title: title,
                body: body,
                data: data,
                channelId: 'slyzah_alert',
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

export const sendBetaInviteEmail = async (to: string, vendorName: string) => {
    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Thabiso Letsoko | Slyzah <thabiso@slyzah.co.za>',
                to: [to],
                subject: 'Run Your Business on the Go with Slyzah Pro 🇿🇦',
                html: `
                    <div style="margin: 0; padding: 0; background-color: #f4f7f9; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f9;">
                            <tr>
                                <td align="center" style="padding: 20px 0;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,31,63,0.1);">
                                        
                                        <!-- Header Logo -->
                                        <tr>
                                            <td align="center" bgcolor="#001C3D" style="padding: 30px 0 20px 0;">
                                                <img src="https://slyzah.co.za/logo-full-navygold.png" width="220" alt="Slyzah Pro Logo" style="display: block; border: 0; outline: none; text-decoration: none;">
                                            </td>
                                        </tr>

                                        <!-- Beta Ribbon -->
                                        <tr>
                                            <td align="center" bgcolor="#001C3D" style="padding-bottom: 0;">
                                                <img src="https://slyzah.co.za/tag-beta-invitation.png" width="600" alt="Beta Invitation" style="display: block; width: 100%; height: auto; border: 0;">
                                            </td>
                                        </tr>

                                        <!-- Hero Section -->
                                        <tr>
                                            <td align="center">
                                                <img src="https://slyzah.co.za/hero-plumber-go.jpg" width="600" alt="Empower Your Business" style="display: block; width: 100%; height: auto; border: 0;">
                                            </td>
                                        </tr>

                                        <!-- Body Content -->
                                        <tr>
                                            <td style="padding: 40px 30px 20px;">
                                                <h2 style="color: #001f3f; font-size: 22px; margin-top: 0; font-weight: 900;">Hi ${vendorName},</h2>
                                                <p style="font-size: 16px; line-height: 1.7; color: #4b5563;">
                                                    Most platforms charge you to "maybe" get a job. At <strong>Slyzah Pro</strong>, we’ve built a system that lets you run your business on the go, effectively becoming a <strong>one-man band</strong>.
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Benefits Section -->
                                        <tr>
                                            <td style="padding: 0 30px;">
                                                <h3 style="color: #001f3f; font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 10px 0 15px 0; letter-spacing: 1px;">Benefits of Slyzah Pro</h3>
                                                <ul style="padding-left: 20px; color: #4b5563; font-size: 15px; line-height: 1.8; margin: 0;">
                                                    <li>You do not pay for leads.</li>
                                                    <li>No chasing leads, leads come to you.</li>
                                                    <li>All leads are in your chosen regions of service.</li>
                                                    <li>All leads have an urgency indicator (urgent, not urgent and just comparing).</li>
                                                    <li>Generate quotations on the app.</li>
                                                    <li>Get notified on app if you have been hired.</li>
                                                    <li>Chat with clients inside the app.</li>
                                                    <li>Get rated and reviewed for your service for others to see.</li>
                                                </ul>

                                                <!-- Subscriptions Section -->
                                                <div style="background-color: #001C3D; padding: 30px; border-radius: 20px; margin-top: 35px; border: 1px solid #BF953F;">
                                                    <h3 style="color: #FFD700; font-size: 15px; font-weight: 900; text-transform: uppercase; margin-top: 0; line-height: 1.4; letter-spacing: 0.5px;">Gain extra competitive advantage over your competitors with our tailored subscriptions</h3>
                                                    <ul style="padding-left: 20px; color: #ffffff; font-size: 14px; line-height: 1.8; margin: 15px 0 0 0;">
                                                        <li>Get a “sponsored tag”</li>
                                                        <li>Priority recommendation.</li>
                                                        <li>Expand to multiple regions and provinces.</li>
                                                        <li>Be the first to be seen in your chosen service regions and provinces.</li>
                                                        <li>Get data insights on what is working and what is not.</li>
                                                        <li>Get data insights on areas of growth.</li>
                                                        <li>Get data insights on areas of that need attention.</li>
                                                        <li>Get data insight on what customers have to say.</li>
                                                    </ul>
                                                </div>
                                            </td>
                                        </tr>

                                        <!-- CTA Section -->
                                        <tr>
                                            <td style="padding: 40px 30px; text-align: center; background-color: #ffffff;">
                                                <a href="https://slyzah.co.za/register" style="background-color: #BF953F; color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 4px 15px rgba(191, 149, 63, 0.3);">CLAIM YOUR PRO PROFILE</a>
                                                <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">Free during Beta. Limited spots available in your region.</p>
                                                <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 30px 0;" />
                                                <p style="margin: 0; font-weight: 900; color: #001f3f; font-size: 14px;">Thabiso Letsoko</p>
                                                <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280; font-weight: bold;">Founder, Slyzah South Africa 🇿🇦</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </div>
                `
            })
        });
        console.log('Beta Invite email sent successfully to:', to);
    } catch (error) {
        console.error('Beta Invite Email Error:', error);
    }
};
