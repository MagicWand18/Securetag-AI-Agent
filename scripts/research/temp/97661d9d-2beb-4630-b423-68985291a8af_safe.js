const http = require('http');
const { execFile } = require('node:child_process');

// Versión segura: en lugar de ejecutar comandos arbitrarios,
// se limita a un conjunto de acciones permitidas y se usan
// APIs que no pasan por el shell.

const ALLOWED_COMMANDS = {
  list: {
    cmd: 'ls',
    args: ['-la']
  },
  date: {
    cmd: 'date',
    args: []
  }
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/run') {
    const action = url.searchParams.get('action') || 'list';

    // Validación estricta: solo se permiten acciones predefinidas.
    const config = ALLOWED_COMMANDS[action];
    if (!config) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      return res.end('Acción no permitida');
    }

    // Uso de execFile sin shell y sin concatenar entrada del usuario.
    execFile(config.cmd, config.args, (error, stdout, stderr) => {
      if (error) {
        // Manejo de errores sin exponer detalles internos al cliente.
        console.error('Command execution error:', error.message);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        return res.end('Error interno');
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
  console.log('Servidor seguro escuchando en http://localhost:3000');
});
