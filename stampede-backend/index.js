// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser'); // To parse JSON bodies
const cors = require('cors'); // To handle CORS for frontend communication
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 5000; // Use port 5000 for backend

// Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Check if we're in demo mode (invalid/missing Twilio credentials)
const isDemoMode = !accountSid || !authToken || accountSid === 'demo_account_sid' || authToken === 'demo_auth_token' || !accountSid.startsWith('AC');

// Helper to ensure 'whatsapp:' prefix is always added
const formatWhatsAppNumber = (number) => {
    return number.startsWith('whatsapp:') ? number : `whatsapp:${number}`;
};

const twilioWhatsAppPhoneNumber = formatWhatsAppNumber(process.env.TWILIO_PHONE_NUMBER || '+14155238886');
const recipientWhatsAppPhoneNumber = formatWhatsAppNumber(process.env.RECIPIENT_PHONE_NUMBER || '+91234567890');

// Initialize Twilio client only if not in demo mode
let client = null;
if (!isDemoMode) {
    try {
        client = new twilio(accountSid, authToken);
        console.log('✅ Twilio client initialized successfully');
    } catch (error) {
        console.warn('⚠️ Twilio initialization failed, switching to demo mode:', error.message);
        isDemoMode = true;
    }
} else {
    console.log('📋 Running in DEMO MODE - WhatsApp messages will be simulated');
    console.log('💡 To enable real WhatsApp sending:');
    console.log('   1. Get Twilio credentials from https://console.twilio.com');
    console.log('   2. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables');
    console.log('   3. Restart the server');
}

// Middleware
app.use(cors()); // Enable CORS for all routes (important for frontend)
app.use(bodyParser.json()); // Parse incoming JSON requests

// Health check route (versioned)
app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// API endpoint to trigger a stampede alert
app.post('/api/alert/stampede', async (req, res) => {
    const { message, crowdDensity, timestamp } = req.body;

    // Input validation
    if (!message || !crowdDensity || isNaN(Number(crowdDensity))) {
        return res.status(400).json({ success: false, error: 'Invalid input: message and numeric crowdDensity required.' });
    }

    // Simplified alert message (no date/time to reduce noise)
    const alertMessage = `🚨 STAMPEDE ALERT! 🚨\nCrowd Density: ${crowdDensity}\nDetails: ${message}`;

    console.log(`Received alert: ${alertMessage}`);
    console.log(`Attempting WhatsApp send from ${twilioWhatsAppPhoneNumber} to ${recipientWhatsAppPhoneNumber}`);

    try {
        if (isDemoMode) {
            console.log('📋 DEMO MODE: Simulating WhatsApp alert send');
            console.log(`📱 Would send to: ${recipientWhatsAppPhoneNumber}`);
            console.log(`📝 Message: ${alertMessage}`);

            res.status(200).json({
                success: true,
                message: 'WhatsApp alert simulated (Demo Mode)',
                demo: true
            });
        } else {
            await client.messages.create({
                body: alertMessage,
                to: recipientWhatsAppPhoneNumber,
                from: twilioWhatsAppPhoneNumber
            });

            console.log('WhatsApp alert sent successfully!');
            res.status(200).json({ success: true, message: 'WhatsApp alert sent!' });
        }
    } catch (error) {
        console.error('Twilio Error:', error); // Internal log

        res.status(500).json({
            success: false,
            error: 'WhatsApp alert failed. Please try again later.'
        });
    }
});

// API endpoint for emergency dispatch notifications
app.post('/api/emergency/dispatch', async (req, res) => {
    const {
        reportId,
        location,
        coordinates,
        emergencyType,
        emergencyServices,
        publicRecipients,
        adminNotes
    } = req.body;

    // Input validation
    if (!reportId || !location || !coordinates || !emergencyServices) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: reportId, location, coordinates, emergencyServices'
        });
    }

    console.log(`🚨 Processing emergency dispatch for report: ${reportId}`);
    console.log(`📍 Location: ${location}`);
    console.log(`🚒 Emergency services to notify: ${emergencyServices.length}`);
    console.log(`👥 Public recipients: ${publicRecipients?.length || 0}`);

    const results = {
        success: true,
        smsResults: [],
        errors: []
    };

    try {
        // Send emergency service notifications
        for (const service of emergencyServices) {
            try {
                const emergencyMessage = `🚨 EMERGENCY DISPATCH ALERT 🚨

${service.icon} ${service.recipient}
📞 Emergency Report ID: ${reportId}

📍 EMERGENCY LOCATION:
${location}
Coordinates: ${coordinates.lat}, ${coordinates.lng}

🚨 EMERGENCY TYPE: ${emergencyType}
⏰ Reported: ${new Date().toLocaleString()}

🗺️ FASTEST ROUTE TO EMERGENCY:
${service.directionsText}

📱 ROUTE LINK: ${service.routeUrl}

✅ VERIFIED by Emergency Response Team
⚡ IMMEDIATE DISPATCH REQUIRED

Emergency Contact: ${service.phone}`;

                if (isDemoMode) {
                    console.log(`📋 DEMO MODE: Simulating emergency alert to ${service.recipient}`);
                    console.log(`📱 Would send to: whatsapp:${service.phone}`);
                    console.log(`📝 Message preview: ${emergencyMessage.substring(0, 100)}...`);

                    results.smsResults.push({
                        recipient: service.recipient,
                        phone: service.phone,
                        success: true,
                        messageId: `demo_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: 'emergency_service',
                        simulated: true
                    });

                    console.log(`✅ Emergency alert simulated for ${service.recipient}`);
                } else {
                    const message = await client.messages.create({
                        from: 'whatsapp:+14155238886', // Twilio Sandbox
                        to: `whatsapp:${service.phone}`,
                        body: emergencyMessage
                    });

                    results.smsResults.push({
                        recipient: service.recipient,
                        phone: service.phone,
                        success: true,
                        messageId: message.sid,
                        type: 'emergency_service',
                        simulated: false
                    });

                    console.log(`✅ Emergency alert sent to ${service.recipient}: ${message.sid}`);
                }
            } catch (error) {
                console.error(`❌ Failed to send to ${service.recipient}:`, error.message);
                results.smsResults.push({
                    recipient: service.recipient,
                    phone: service.phone,
                    success: false,
                    error: error.message,
                    type: 'emergency_service',
                    simulated: isDemoMode
                });
                results.errors.push(`Emergency service ${service.recipient}: ${error.message}`);
            }
        }

        // Send public notifications
        if (publicRecipients && publicRecipients.length > 0) {
            const publicMessage = `🚨 EMERGENCY ALERT 🚨

📍 Location: ${location}
📱 Reported: ${emergencyType}
⏰ Time: ${new Date().toLocaleString()}
🗺️ Maps: https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}

🚒 Emergency Services Dispatched:
${emergencyServices.map(s => `${s.icon} ${s.serviceName} (ETA: ${s.eta})`).join('\n')}

✅ Verified by Emergency Response Team
⚡ Take immediate safety precautions
📞 Stay clear of emergency vehicles

Stay Safe! 🙏`;

            for (const user of publicRecipients) {
                try {
                    if (isDemoMode) {
                        console.log(`📋 DEMO MODE: Simulating public alert to ${user.name}`);
                        console.log(`📱 Would send to: whatsapp:${user.phone}`);

                        results.smsResults.push({
                            recipient: user.name,
                            phone: user.phone,
                            success: true,
                            messageId: `demo_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            type: 'public_user',
                            simulated: true
                        });

                        console.log(`✅ Public alert simulated for ${user.name}`);
                    } else {
                        const message = await client.messages.create({
                            from: 'whatsapp:+14155238886', // Twilio Sandbox
                            to: `whatsapp:${user.phone}`,
                            body: publicMessage
                        });

                        results.smsResults.push({
                            recipient: user.name,
                            phone: user.phone,
                            success: true,
                            messageId: message.sid,
                            type: 'public_user',
                            simulated: false
                        });

                        console.log(`✅ Public alert sent to ${user.name}: ${message.sid}`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to send to ${user.name}:`, error.message);
                    results.smsResults.push({
                        recipient: user.name,
                        phone: user.phone,
                        success: false,
                        error: error.message,
                        type: 'public_user',
                        simulated: isDemoMode
                    });
                    results.errors.push(`Public user ${user.name}: ${error.message}`);
                }
            }
        }

        const totalSent = results.smsResults.filter(r => r.success).length;
        const totalFailed = results.smsResults.filter(r => !r.success).length;

        console.log(`📊 Emergency dispatch completed: ${totalSent} sent, ${totalFailed} failed`);

        res.status(200).json({
            success: results.errors.length === 0,
            message: `Emergency notifications processed: ${totalSent} sent, ${totalFailed} failed`,
            totalSent,
            totalFailed,
            smsResults: results.smsResults,
            errors: results.errors
        });

    } catch (error) {
        console.error('❌ Emergency dispatch error:', error);
        res.status(500).json({
            success: false,
            error: 'Emergency dispatch failed. Please try again.',
            details: error.message
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Stampede Detection Backend running at http://localhost:${port}`);
    console.log(`Make sure .env includes correct phone numbers WITHOUT "whatsapp:" prefix; it is now auto-handled.`);
    console.log(`Ensure recipient has joined the Twilio WhatsApp Sandbox.`);
});
