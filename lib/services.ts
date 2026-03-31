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
                subject: 'StopYour Business on the Go with Slyzah Pro 🇿🇦',
                html: `
                    <div style="background-color: #f4f7f9; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333;">
                        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,31,63,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #001f3f; padding: 30px; text-align: center;">
                                    <img src="https://slyzah.co.za/logo6.png" width="60" height="60" alt="Slyzah Logo" style="margin-bottom: 10px;">
                                    <h1 style="color: #FFD700; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; font-weight: 900;">SLYZAH</h1>
                                </td>
                            </tr>
                            
                            <!-- Body -->
                            <tr>
                                <td style="padding: 40px;">
                                    <h2 style="color: #001f3f; font-size: 22px; margin-top: 0; font-weight: 900;">Hi ${vendorName},</h2>
                                    <p style="font-size: 16px; line-height: 1.7; color: #555;">
                                        Most platforms charge you to "maybe" get a job. At <strong>Slyzah Pro</strong>, we’ve built a system that lets you run your business on the go, effectively becoming a <strong>one-man band</strong>.
                                    </p>
                                    
                                    <h3 style="color: #001f3f; text-transform: uppercase; font-size: 14px; letter-spacing: 1px; margin-top: 30px;">Benefits of Slyzah Pro:</h3>
                                    <ul style="padding-left: 20px; color: #555; font-size: 15px; line-height: 1.8;">
                                        <li><strong>Zero Lead Fees:</strong> You do not pay for leads.</li>
                                        <li><strong>Inbound Power:</strong> No chasing leads, leads come to you.</li>
                                        <li><strong>Targeted Reach:</strong> All leads are in your chosen regions of service.</li>
                                        <li><strong>Urgency Indicators:</strong> See if it's urgent, standard, or just a comparison.</li>
                                        <li><strong>Instant Quoting:</strong> Generate professional quotations on the app.</li>
                                        <li><strong>Hired Alerts:</strong> Get notified immediately on the app if you have been hired.</li>
                                        <li><strong>Secure Chat:</strong> Communicate with clients directly inside the app.</li>
                                        <li><strong>Verified Reviews:</strong> Get rated and reviewed for your service for others to see.</li>
                                    </ul>

                                    <div style="background-color: #001f3f; color: #ffffff; padding: 30px; border-radius: 16px; margin-top: 35px;">
                                        <h3 style="color: #FFD700; text-transform: uppercase; font-size: 14px; letter-spacing: 1px; margin-top: 0;">Tailored Subscriptions:</h3>
                                        <p style="font-size: 14px; color: #ccc; margin-bottom: 20px;">Gain a massive advantage over your competitors:</p>
                                        <ul style="padding-left: 20px; color: #fff; font-size: 13px; line-height: 1.8;">
                                            <li>Get a <strong>“Sponsored Tag”</strong> for instant trust.</li>
                                            <li><strong>Priority Recommendations</strong> in customer searches.</li>
                                            <li>Expand your reach to multiple regions and provinces.</li>
                                            <li>Be the first to be seen in your chosen service areas.</li>
                                            <li><strong>Data Insights:</strong> See what is working and what is not.</li>
                                            <li><strong>Growth Analytics:</strong> Identify new areas of growth and opportunity.</li>
                                            <li><strong>Customer Intelligence:</strong> Know exactly what customers have to say.</li>
                                        </ul>
                                    </div>

                                    <div style="text-align: center; margin-top: 40px;">
                                        <a href="https://slyzah.co.za/register" style="background-color: #FFD700; color: #001f3f; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);">Join Slyzah Pro</a>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 30px; text-align: center; border-top: 1px solid #eee;">
                                    <p style="margin: 0; color: #aaa; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
                                        Let’s stop the quote-chasing.
                                    </p>
                                    <p style="margin: 10px 0 0 0; color: #001f3f; font-size: 14px; font-weight: 900;">
                                        Thabiso Letsoko
                                    </p>
                                    <p style="margin: 0; color: #999; font-size: 12px;">Founder, Slyzah South Africa 🇿🇦</p>
                                </td>
                            </tr>
                        </table>
                        <div style="text-align: center; margin-top: 20px;">
                             <p style="color: #aaa; font-size: 10px;">If you'd like to unsubscribe, <a href="#" style="color: #aaa;">click here</a>.</p>
                        </div>
                    </div>
                `
            })
        });
        console.log('Beta Invite email sent successfully to:', to);
    } catch (error) {
        console.error('Beta Invite Email Error:', error);
    }
};
