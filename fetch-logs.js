const { execSync } = require('child_process');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');

// Get fresh build JSON
const json = execSync('npx eas-cli build:view c23829a3-75e5-4b31-8001-aafbdda2ecf0 --json', {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
});

const data = JSON.parse(json);

if (data.logFiles && data.logFiles.length > 0) {
    const logUrl = data.logFiles[0];

    https.get(logUrl, (res) => {
        const chunks = [];
        res.on('data', (chunk) => { chunks.push(chunk); });
        res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            let text;
            try {
                const decompressed = zlib.brotliDecompressSync(buffer);
                text = decompressed.toString('utf8');
                console.log('Decompressed with brotli');
            } catch (e1) {
                try {
                    const decompressed = zlib.gunzipSync(buffer);
                    text = decompressed.toString('utf8');
                    console.log('Decompressed with gzip');
                } catch (e2) {
                    text = buffer.toString('utf8');
                    console.log('Using raw text');
                }
            }
            fs.writeFileSync('build-log-decoded.js', text);
            const lines = text.split('\n');
            const lastLines = lines.slice(-100);
            console.log('=== LAST 100 LINES OF BUILD LOG ===');
            console.log(lastLines.join('\n'));
        });
    }).on('error', (e) => {
        console.error('Error fetching logs:', e.message);
    });
}
