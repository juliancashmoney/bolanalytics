// Import required modules
const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Initialize Express app
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// File upload setup using Multer
const upload = multer({ dest: 'uploads/' });

// Helper function to parse and process CSV
const processCsv = (filePath) => {
    return new Promise((resolve, reject) => {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const report = results.data
                    .map((row) => {
                        const freeStock = parseInt(row['Vrije voorraad'], 10);
                        const forecastMax = parseInt(row['Verkoopprognose max (Totaal 4w)'], 10);

                        // Determine LogisticType based on specific column values
                        let logisticType = 'Unknown';
                        if (row['Mijn levertijd'] === 'MijnLeverbelofte') {
                            logisticType = 'QLS';
                        } else if (row['Mijn levertijd'] === 'Lvb') {
                            logisticType = 'Lvb';
                        }

                        if (isNaN(freeStock) || isNaN(forecastMax)) {
                            return null;
                        }

                        const restockQuantity = Math.max(0, forecastMax - freeStock);

                        if (restockQuantity > 0) {
                            return {
                                EAN: row['EAN'],
                                Title: row['Titel'],
                                FreeStock: freeStock,
                                Forecast: forecastMax,
                                RestockQuantity: restockQuantity,
                                LogisticType: logisticType,
                            };
                        }

                        return null;
                    })
                    .filter(Boolean);

                resolve(report);
            },
            error: (err) => reject(err),
        });
    });
};

// API Endpoints

// Default route
app.get('/', (req, res) => {
    res.send('Welcome to the Inventory Restocking Tool! Use the /upload endpoint to upload your CSV file.');
});

// Upload CSV and process it
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        const report = await processCsv(req.file.path);

        // Delete the uploaded file after processing
        fs.unlinkSync(req.file.path);

        res.json({ status: 'success', report });
    } catch (error) {
        console.error('Error processing CSV:', error);
        res.status(500).json({ error: 'Error processing CSV.' });
    }
});

// Download processed report as CSV
app.post('/report/download', (req, res) => {
    const { report } = req.body;

    if (!report || !Array.isArray(report)) {
        return res.status(400).json({ error: 'Invalid report data.' });
    }

    const csvData = Papa.unparse(report);
    const filePath = path.join(__dirname, 'downloads', `restock_report_${Date.now()}.csv`);

    fs.writeFileSync(filePath, csvData);

    res.download(filePath, (err) => {
        if (err) {
            console.error('Error downloading file:', err);
        }

        // Clean up the file after download
        fs.unlinkSync(filePath);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
