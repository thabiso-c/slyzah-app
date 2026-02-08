const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withCustomNotificationSound(config) {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const androidRawResPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw');
            const sourceSoundPath = path.join(projectRoot, 'assets', 'notification-sound.mp3');
            const targetSoundPath = path.join(androidRawResPath, 'notification_sound.mp3'); // Android requires lowercase, underscores

            // Ensure the raw directory exists
            if (!fs.existsSync(androidRawResPath)) {
                fs.mkdirSync(androidRawResPath, { recursive: true });
            }

            // Copy the sound file
            if (fs.existsSync(sourceSoundPath)) {
                fs.copyFileSync(sourceSoundPath, targetSoundPath);
                console.log(`Copied custom notification sound to ${targetSoundPath}`);
            } else {
                console.warn(`Custom notification sound not found at ${sourceSoundPath}`);
            }

            return config;
        },
    ]);
}

module.exports = withCustomNotificationSound;
