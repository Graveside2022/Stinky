const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8889;

// Serve the mobile-optimized HTML as the root page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'kismet-operations', 'views', 'index_mobile_optimized.html'));
});

// Serve static assets
app.use('/css', express.static(path.join(__dirname, '..', '..', '..', 'assets', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', '..', '..', 'assets', 'js')));
app.use('/public', express.static(path.join(__dirname, '..', 'kismet-operations', 'public')));

// Serve MGRS library
app.get('/mgrs.min.js', (req, res) => {
    const mgrsPath = path.join(__dirname, '..', 'kismet-operations', 'public', 'js', 'mgrs.min.js');
    if (fs.existsSync(mgrsPath)) {
        res.sendFile(mgrsPath);
    } else {
        // Fallback MGRS stub
        res.type('application/javascript');
        res.send(`window.MGRS = { forward: function(coords) { return 'N/A'; }, inverse: function(mgrs) { return [0, 0]; } };`);
    }
});

// Proxy API requests to main server on 8002
const { createProxyMiddleware } = require('http-proxy-middleware');
const apiProxy = createProxyMiddleware({
    target: 'http://localhost:8002',
    changeOrigin: true,
    ws: true
});

app.use('/info', apiProxy);
app.use('/kismet-data', apiProxy);
app.use('/script-status', apiProxy);
app.use('/run-script', apiProxy);
app.use('/stop-script', apiProxy);
app.use('/kismet', apiProxy);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mobile-optimized Kismet Operations Center running on http://0.0.0.0:${PORT}`);
    console.log(`Access from any device at http://100.68.185.86:${PORT}`);
});