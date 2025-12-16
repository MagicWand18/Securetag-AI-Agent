const http = require('http');
const { exec } = require('child_process');
const { DOMParser } = require('xmldom');

// Servidor HTTP sencillo que recibe XML y lo parsea de forma insegura
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
    try {
      // VULNERABLE: uso directo de DOMParser sin deshabilitar entidades externas
      // En un entorno JVM (por ejemplo, Rhino/Nashorn o Graal.js) esto puede
      // derivar en un XXE si el parser subyacente permite DTD/entidades externas.
      const parser = new DOMParser({
        errorHandler: {
          warning: function (msg) { console.warn('warning', msg); },
          error: function (msg) { console.error('error', msg); },
          fatalError: function (msg) { console.error('fatalError', msg); }
        }
      });

      const doc = parser.parseFromString(body, 'text/xml');

      // Acceso directo a nodos, sin validación de contenido
      const commandNode = doc.getElementsByTagName('command')[0];
      const command = commandNode && commandNode.textContent ? commandNode.textContent.trim() : '';

      // Ejemplo de uso peligroso del contenido del XML
      if (command) {
        // VULNERABLE: ejecución de comando basado en datos del XML
        exec(command, (err, stdout, stderr) => {
          if (err) {
            console.error('Command error:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            return res.end('Error executing command');
          }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(`Command output:\n${stdout}`);
        });
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('No <command> element found');
      }
    } catch (e) {
      // Palabras clave típicas que un motor SAST/IAST podría buscar
      console.error('DOMException or SAXParseException while parsing XML:', e);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid XML');
    }
  });
}).listen(3000, () => {
  console.log('Insecure XML server listening on port 3000');
});
