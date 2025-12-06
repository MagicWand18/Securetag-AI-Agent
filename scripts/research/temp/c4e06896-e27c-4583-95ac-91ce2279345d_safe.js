const http = require('http');
const { execFile } = require('child_process');
const { XMLParser } = require('fast-xml-parser'); // Parser más seguro con opciones para deshabilitar entidades externas

// Configuración segura del parser: sin DTD, sin entidades externas, sin procesamiento de DOCTYPE
const parserOptions = {
  ignoreAttributes: false,
  allowBooleanAttributes: true,
  processEntities: false,          // No expandir entidades
  dtd: false,                      // No procesar DTD
  parseTagValue: true,
  parseAttributeValue: true
};

const xmlParser = new XMLParser(parserOptions);

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/upload-xml') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        // El formulario envía algo como: xml=<contenido>
        // Extraemos solo el valor del campo xml de forma sencilla
        const match = body.match(/xml=([\s\S]*)/);
        const xmlRaw = match ? decodeURIComponent(match[1]) : '';

        if (!xmlRaw.trim()) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          return res.end('XML payload is required');
        }

        // PARSEO SEGURO: sin DTD ni entidades externas (mitiga XXE)
        const jsonObj = xmlParser.parse(xmlRaw);

        const command = (jsonObj && jsonObj.root && jsonObj.root.command) ? String(jsonObj.root.command).trim() : '';

        // Lista blanca de comandos permitidos para evitar ejecución arbitraria
        const allowedCommands = {
          hello: { cmd: 'echo', args: ['Hello'] },
          date: { cmd: 'date', args: [] }
        };

        const selected = allowedCommands[command] || allowedCommands.hello;

        execFile(selected.cmd, selected.args, (error, stdout, stderr) => {
          if (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            return res.end('Command error');
          }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Command output: ' + stdout);
        });
      } catch (e) {
        // En entornos JVM, errores similares podrían verse como SAXParseException o DOMException,
        // pero aquí el parser está configurado para no procesar DTD/entidades externas.
        console.error('Safe XML parse error:', e);
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
            <textarea name="xml" rows="10" cols="50"><root><command>hello</command></root></textarea><br/>
            <button type="submit">Send XML</button>
          </form>
        </body>
      </html>
    `);
  }
}).listen(3001, () => {
  console.log('Secure XML server listening on port 3001');
});

// Este ejemplo muestra cómo realizar la misma funcionalidad de parseo de XML
// mitigando XXE mediante un parser configurado de forma segura y evitando el uso
// directo de datos del XML en comandos del sistema.