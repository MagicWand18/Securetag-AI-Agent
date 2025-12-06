const http = require('http');
const { exec } = require('node:child_process');

// Servidor HTTP muy simple que ejecuta comandos del sistema
// PELIGRO: Este código es vulnerable a RCE si se despliega en producción
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/run') {
    const userCmd = url.searchParams.get('cmd') || 'ls';

    // VULNERABILIDAD: el comando se construye directamente con input del usuario
    // Si el comando falla, se captura el error, lo que puede disparar la regla de detección
    exec(userCmd, (error, stdout, stderr) => {
      if (error) {
        // Proceso de ejecución relacionado con errores (potencial intento de explotación RCE)
        console.error('Command execution failed:', error); // <-- patrón que la regla puede detectar
        res.statusCode = 500;
        return res.end('Command execution error');
      }

      if (stderr) {
        console.error('Command stderr:', stderr);
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(stdout || 'No output');
    });
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

server.listen(3000, () => {
  console.log('Vulnerable server listening on http://localhost:3000');
});
