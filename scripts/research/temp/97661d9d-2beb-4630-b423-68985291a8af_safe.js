const http = require('http');
const { spawn } = require('node:child_process');

// Lista blanca de comandos permitidos
const ALLOWED_COMMANDS = new Set(['ls', 'pwd', 'whoami']);

// Servidor HTTP que ejecuta solo comandos predefinidos de forma segura
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/run') {
    const userCmd = url.searchParams.get('cmd') || 'ls';

    // Validación estricta: solo se permiten comandos de una lista blanca
    if (!ALLOWED_COMMANDS.has(userCmd)) {
      res.statusCode = 400;
      return res.end('Invalid command');
    }

    // Uso de spawn con argumentos controlados, sin concatenar input del usuario
    const child = spawn(userCmd, [], { shell: false });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('error', (err) => {
      // Manejo de errores genérico, sin exponer detalles internos al usuario
      console.error('Safe command execution error:', err.message);
      res.statusCode = 500;
      res.end('Internal server error');
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.warn(`Command exited with code ${code}`);
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(output || (errorOutput || 'No output'));
    });
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

server.listen(3000, () => {
  console.log('Safe server listening on http://localhost:3000');
});
