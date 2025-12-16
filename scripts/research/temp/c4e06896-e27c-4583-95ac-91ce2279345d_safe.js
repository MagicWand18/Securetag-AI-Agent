const http = require('http');
const { execFile } = require('child_process');
const sax = require('sax');

// Servidor HTTP que procesa XML de forma más segura
http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    return res.end('Use POST with XML body');
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    // Parser SAX en modo estricto, sin soporte de DTD ni entidades externas
    const strict = true;
    const parser = sax.parser(strict, {
      lowercase: true,
      xmlns: false,
      // No hay soporte de DTD/entidades externas en sax por diseño,
      // lo que mitiga XXE en entornos JVM que usen este código.
    });

    let currentTag = null;
    let commandText = '';

    parser.onopentag = (node) => {
      currentTag = node.name;
    };

    parser.ontext = (text) => {
      if (currentTag === 'command') {
        commandText += text;
      }
    };

    parser.onclosetag = (name) => {
      if (name === 'command') {
        currentTag = null;
      }
    };

    parser.onerror = (err) => {
      console.error('SAXParseException while parsing XML:', err);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid XML');
    };

    parser.onend = () => {
      const command = (commandText || '').trim();

      // Validación estricta del comando permitido
      const allowedCommands = {
        'date': { cmd: 'date', args: [] },
        'uptime': { cmd: 'uptime', args: [] }
      };

      if (!command || !allowedCommands[command]) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Invalid or unsupported command');
      }

      const { cmd, args } = allowedCommands[command];

      // Uso de execFile con lista blanca de comandos y sin concatenar entrada
      execFile(cmd, args, (err, stdout, stderr) => {
        if (err) {
          console.error('Command error:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end('Error executing command');
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`Command output:\n${stdout}`);
      });
    };

    try {
      parser.write(body).close();
    } catch (e) {
      console.error('Error while parsing XML:', e);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid XML');
    }
  });
}).listen(3001, () => {
  console.log('Secure XML server listening on port 3001');
});
