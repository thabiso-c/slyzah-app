const fs = require('fs');
const path = require('path');

const { GOOGLE_SERVICES_JSON, GOOGLE_SERVICE_INFO_PLIST, GOOGLE_MAPS_API_KEY } = process.env;

if (GOOGLE_SERVICES_JSON) {
    try {
        const decoded = Buffer.from(GOOGLE_SERVICES_JSON, 'base64').toString('utf8');

        // Validate JSON to catch encoding errors early
        try {
            JSON.parse(decoded);
        } catch (e) {
            throw new Error("GOOGLE_SERVICES_JSON is not valid JSON. Ensure the secret is Base64 encoded.");
        }

        // Write to root (standard for Expo Managed)
        fs.writeFileSync(path.join(process.cwd(), 'google-services.json'), decoded);
        console.log('✅ Created google-services.json');

        // Also write to android/app if the android folder exists (Bare workflow / Prebuild compatibility)
        if (fs.existsSync(path.join(process.cwd(), 'android'))) {
            const androidAppPath = path.join(process.cwd(), 'android', 'app');
            fs.mkdirSync(androidAppPath, { recursive: true });
            fs.writeFileSync(path.join(androidAppPath, 'google-services.json'), decoded);
            console.log('✅ Created android/app/google-services.json');
        }
    } catch (error) {
        console.error('❌ Error creating google-services.json:', error);
        process.exit(1);
    }
}

if (GOOGLE_MAPS_API_KEY) {
    try {
        const content = `export const GOOGLE_MAPS_API_KEY = '${GOOGLE_MAPS_API_KEY}';`;
        fs.writeFileSync(path.join(process.cwd(), 'app', 'secrets.ts'), content);
        console.log('✅ Created app/secrets.ts');
    } catch (error) {
        console.error('❌ Error creating app/secrets.ts:', error);
        process.exit(1);
    }
}

if (GOOGLE_SERVICE_INFO_PLIST) {
    try {
        const decoded = Buffer.from(GOOGLE_SERVICE_INFO_PLIST, 'base64').toString('utf8');
        fs.writeFileSync(path.join(process.cwd(), 'GoogleService-Info.plist'), decoded);
        console.log('✅ Created GoogleService-Info.plist');
    } catch (error) {
        console.error('❌ Error creating GoogleService-Info.plist:', error);
        process.exit(1);
    }
}