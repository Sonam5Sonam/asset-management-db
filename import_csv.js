const fs = require('fs');
const https = require('https');

// Configuration
const CSV_FILE = 'groups.csv';
// We need the full URL of the deployed function or localhost if running locally.
// Since we are in the environment, we can try to use the live URL or just direct DB insert if we had credentials.
// But sticking to the pattern, let's use the deployed API URL if possible, or we can use the 'pg' client directly here since we have the env var in Netlify context... 
// Wait, I don't have the NETLIFY_DATABASE_URL exposed to this script easily unless I hardcode it or read it from somewhere.
// Actually, the user's app is deployed. I can hit the live API endpoint? 
// "https://radiant-shortbread-f903f0.netlify.app/.netlify/functions/assets"
const API_URL = 'https://radiant-shortbread-f903f0.netlify.app/.netlify/functions/assets';

const readFile = () => {
    try {
        const data = fs.readFileSync(CSV_FILE, 'utf8');
        return data;
    } catch (err) {
        console.error('Error reading file:', err);
        return null;
    }
};

const parseCSV = (csvText) => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const results = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Handle commas inside quotes if necessary, but simple split for now
        // This CSV seems simple enough
        const currentLine = lines[i].split(',');
        const obj = {};

        // Map columns
        // Group name, Description, Assets, Available assets, Asset stock quantity, ...

        const groupName = currentLine[0];
        const stockQty = parseInt(currentLine[4]) || 0;

        if (stockQty > 0) {
            results.push({
                name: groupName,
                category: groupName,
                quantity: stockQty,
                type: 'stock',
                location: 'Unassigned',
                price: 0,
                purchaseDate: new Date().toISOString().split('T')[0],
                serialNumber: 'STOCK-' + Math.floor(Math.random() * 10000)
            });
        }
    }
    return results;
};

const importData = async () => {
    const csvData = readFile();
    if (!csvData) return;

    const items = parseCSV(csvData);
    console.log(`Found ${items.length} items to import...`);

    for (const item of items) {
        await new Promise((resolve, reject) => {
            const req = https.request(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    console.log(`Imported: ${item.name} (Qty: ${item.quantity}) - Status: ${res.statusCode}`);
                    resolve();
                });
            });

            req.on('error', (e) => {
                console.error(`Problem with request: ${e.message}`);
                resolve(); // Continue anyway
            });

            req.write(JSON.stringify(item));
            req.end();
        });
        // Small delay to be nice to the server
        await new Promise(r => setTimeout(r, 200));
    }
    console.log('Import complete!');
};

importData();
