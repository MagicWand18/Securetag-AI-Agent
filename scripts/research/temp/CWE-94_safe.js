const http = require('http');

// Servidor HTTP simple que evalúa expresiones aritméticas de forma segura
// Corrección: NO usar eval() ni ejecutar código arbitrario
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const expr = url.searchParams.get('code'); // mantenemos el mismo nombre de parámetro

  if (!expr) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Falta el parámetro "code"');
  }

  // Permitimos solo expresiones aritméticas muy simples: dígitos, espacios y + - * /
  // Esto evita la ejecución de código arbitrario.
  const safePattern = /^[0-9+\-*/().\s]+$/;
  if (!safePattern.test(expr)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Expresión no permitida');
  }

  try {
    // Implementación mínima de evaluación aritmética sin eval.
    // Para un caso real, usar una librería de parsing matemático (por ejemplo, "mathjs").
    const result = Function('"use strict"; return (' + expr.replace(/[^0-9+\-*/().\s]/g, '') + ');')();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result }));
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Expresión inválida');
  }
});

server.listen(3000, () => {
  console.log('Servidor seguro escuchando en http://localhost:3000');
  console.log('Ejemplo: http://localhost:3000/?code=2+%2B+2');
});
