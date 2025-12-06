const express = require('express');
const app = express();

// Función sencilla para escapar caracteres peligrosos en HTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Versión segura: escapa los datos controlados por el usuario antes de insertarlos en el HTML
app.get('/search', (req, res) => {
  const query = req.query.q || '';
  const safeQuery = escapeHtml(query);

  const html = `
    <html>
      <head><title>Resultados de búsqueda</title></head>
      <body>
        <h1>Resultados para: ${safeQuery}</h1>
        <form method="GET" action="/search">
          <input type="text" name="q" value="${safeQuery}">
          <button type="submit">Buscar</button>
        </form>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.listen(3000, () => {
  console.log('Servidor seguro escuchando en http://localhost:3000');
});
