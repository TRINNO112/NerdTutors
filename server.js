import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Helper to parse POST request body
function getRequestBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve(body);
            }
        });
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname}`);

    // Route API requests
    if (pathname.startsWith('/api/')) {
        const handlerName = pathname.replace('/api/', '');
        const handlerPath = path.join(__dirname, 'api', `${handlerName}.js`);

        if (fs.existsSync(handlerPath)) {
            try {
                // Dynamically import the Vercel handler
                const module = await import(`file://${handlerPath}?update=${Date.now()}`); // query param to bypass module caching
                const handler = module.default;

                // Mock req and res for Vercel
                const mockReq = {
                    method: req.method,
                    headers: req.headers,
                    query: Object.fromEntries(url.searchParams),
                    body: req.method === 'POST' ? await getRequestBody(req) : {}
                };

                const mockRes = {
                    headers: {},
                    setHeader(name, value) {
                        this.headers[name] = value;
                        res.setHeader(name, value);
                        return this;
                    },
                    status(code) {
                        res.statusCode = code;
                        return this;
                    },
                    json(data) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(data));
                        return this;
                    },
                    end(data) {
                        res.end(data);
                        return this;
                    }
                };

                await handler(mockReq, mockRes);
            } catch (err) {
                console.error(`❌ Error in handler ${handlerName}:`, err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Internal Server Error', details: err.message }));
            }
        } else {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
        }
        return;
    }

    // Serve static files
    let filePath = path.join(__dirname, pathname === '/' ? 'ocr-scan.html' : pathname);
    
    // Fallback HTML resolution if extension is omitted (like "/login-gate")
    if (!path.extname(filePath)) {
        if (fs.existsSync(`${filePath}.html`)) {
            filePath += '.html';
        }
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf'
        };

        res.statusCode = 200;
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end(`<h3>404 Not Found</h3><p>File not found: ${pathname}</p>`);
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Standalone Local Server running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT}/ocr-scan.html in your browser to start scanning!`);
});
