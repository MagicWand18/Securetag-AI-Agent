import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function serveDocs(req: http.IncomingMessage, res: http.ServerResponse): boolean {
    const method = req.method || 'GET'
    if (method !== 'GET') return false

    const url = req.url || '/'
    
    // 1. Serve openapi.yaml
    if (url === '/openapi.yaml') {
        // Try multiple locations for robustness (dev vs prod/docker)
        const candidates = [
            path.join(process.cwd(), 'src/server/docs/openapi.yaml'),
            path.join(__dirname, '../docs/openapi.yaml'), // if running from src
            path.join(__dirname, '../../src/server/docs/openapi.yaml') // if running from dist
        ]

        let yamlPath = ''
        for (const p of candidates) {
            if (fs.existsSync(p)) {
                yamlPath = p
                break
            }
        }

        if (!yamlPath) {
            console.error('openapi.yaml not found in:', candidates)
            res.statusCode = 404
            res.end('OpenAPI spec not found')
            return true
        }

        try {
            const content = fs.readFileSync(yamlPath, 'utf8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/yaml')
            res.end(content)
            return true
        } catch (e) {
            res.statusCode = 500
            res.end('Error reading spec')
            return true
        }
    }

    // 2. Redirect /docs to /docs/
    if (url === '/docs') {
        res.statusCode = 302
        res.setHeader('Location', '/docs/')
        res.end()
        return true
    }

    // 3. Serve Swagger UI assets
    if (url.startsWith('/docs/')) {
        const relativePath = url.slice(6) || 'index.html'
        // Avoid directory traversal
        if (relativePath.includes('..')) {
            res.statusCode = 403
            res.end('Forbidden')
            return true
        }

        let distPath = ''
        try {
            distPath = path.dirname(require.resolve('swagger-ui-dist/package.json'))
        } catch {
            // Fallback
            distPath = path.join(process.cwd(), 'node_modules/swagger-ui-dist')
        }

        const filePath = path.join(distPath, relativePath)

        // Special handling for index.html (older versions) or swagger-initializer.js (newer versions)
        if (relativePath === 'index.html' || relativePath === '') {
            const indexPath = path.join(distPath, 'index.html')
            if (fs.existsSync(indexPath)) {
                let content = fs.readFileSync(indexPath, 'utf8')
                // Legacy replacement just in case
                content = content.replace(/url:\s*["'][^"']+["']/, 'url: "/openapi.yaml"')
                
                res.statusCode = 200
                res.setHeader('Content-Type', 'text/html')
                res.end(content)
                return true
            }
        }

        if (relativePath === 'swagger-initializer.js') {
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8')
                // Replace default URL
                content = content.replace('https://petstore.swagger.io/v2/swagger.json', '/openapi.yaml')
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/javascript')
                res.end(content)
                return true
            }
        }

        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
            const ext = path.extname(filePath)
            let contentType = 'text/plain'
            if (ext === '.css') contentType = 'text/css'
            if (ext === '.js') contentType = 'application/javascript'
            if (ext === '.png') contentType = 'image/png'
            if (ext === '.html') contentType = 'text/html'
            
            res.statusCode = 200
            res.setHeader('Content-Type', contentType)
            res.end(fs.readFileSync(filePath))
            return true
        }

        res.statusCode = 404
        res.end('Not found')
        return true
    }

    return false
}
