const http = require('http');

// Servidor HTTP simple que evalúa código recibido por query string
// EJEMPLO INSEGURO: Code Injection via eval()
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Falta el parámetro "code"');
  }

  try {
    // VULNERABILIDAD: ejecución directa de código controlado por el usuario
    const result = eval(code); // CWE-94

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error al ejecutar el código');
  }
});

server.listen(3000, () => {
  console.log('Servidor inseguro escuchando en http://localhost:3000');
  console.log('Ejemplo: http://localhost:3000/?code=2+%2B+2');
});
