const http = require('http');
const { exec } = require('node:child_process');

// Servidor HTTP muy simple que ejecuta comandos del sistema
// en base a parámetros proporcionados por el usuario.
// Este código es intencionalmente vulnerable para pruebas SAST.

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/run') {
    const userCmd = url.searchParams.get('cmd') || 'ls';

    // VULNERABILIDAD: se concatena directamente la entrada del usuario
    // en un comando del sistema operativo.
    const fullCommand = `sh -c "${userCmd}"`;

    exec(fullCommand, (error, stdout, stderr) => {
      if (error) {
        // Este tipo de error puede ser detectado como intento de RCE
        // por reglas que monitorizan errores de node:child_process.
        console.error('Command execution error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        return res.end('Error ejecutando comando');
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(stdout || stderr || 'Comando ejecutado');
    });
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not found');
  }
});

server.listen(3000, () => {
  console.log('Servidor vulnerable escuchando en http://localhost:3000');
});
