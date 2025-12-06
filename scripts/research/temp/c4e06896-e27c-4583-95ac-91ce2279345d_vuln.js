const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');
const { DOMParser } = require('xmldom'); // Parser inseguro si se usa sin restricciones

// Servidor HTTP sencillo que recibe XML y lo parsea de forma insegura
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/upload-xml') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        // VULNERABILIDAD: parseo de XML sin deshabilitar entidades externas (XXE)
        // En un entorno JVM, esto podría disparar errores como SAXParseException o DOMException
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(body, 'text/xml');

        const commandNode = xmlDoc.getElementsByTagName('command')[0];
        const command = commandNode && commandNode.textContent ? commandNode.textContent.trim() : 'echo No command';

        // Uso inseguro del contenido del XML (solo para hacer el ejemplo más realista)
        exec(command, (error, stdout, stderr) => {
          if (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            return res.end('Command error: ' + error.message);
          }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Command output: ' + stdout);
        });
      } catch (e) {
        // En un entorno JVM, errores de parseo podrían manifestarse como SAXParseException o DOMException
        console.error('XML parse error:', e);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid XML');
      }
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <form method="POST" action="/upload-xml">
            <textarea name="xml" rows="10" cols="50"><root><command>echo Hello</command></root></textarea><br/>
            <button type="submit">Send XML</button>
          </form>
        </body>
      </html>
    `);
  }
}).listen(3000, () => {
  console.log('Insecure XML server listening on port 3000');
});

// Nota: Este ejemplo es intencionalmente inseguro para probar reglas SAST relacionadas con XXE y parseo de XML.