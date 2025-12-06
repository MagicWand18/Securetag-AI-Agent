const express = require('express');
const app = express();

// Ejemplo vulnerable a XSS: refleja directamente datos controlados por el usuario en la respuesta HTML
app.get('/search', (req, res) => {
  const query = req.query.q || '';

  // VULNERABLE: se inserta el valor de 'q' sin escapar en el HTML
  const html = `
    <html>
      <head><title>Resultados de búsqueda</title></head>
      <body>
        <h1>Resultados para: ${query}</h1>
        <form method="GET" action="/search">
          <input type="text" name="q" value="${query}">
          <button type="submit">Buscar</button>
        </form>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.listen(3000, () => {
  console.log('Servidor vulnerable escuchando en http://localhost:3000');
});
