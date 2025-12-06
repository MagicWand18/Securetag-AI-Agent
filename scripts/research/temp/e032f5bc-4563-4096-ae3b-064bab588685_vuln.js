const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Ruta vulnerable: lee cualquier archivo del sistema según el parámetro "file"
app.get('/read-file', (req, res) => {
  const userFile = req.query.file; // input controlado por el usuario

  // VULNERABILIDAD: concatenación directa del input del usuario a la ruta
  // Un atacante puede usar payloads como: ?file=../../../../etc/passwd
  const filePath = path.join(__dirname, userFile);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      // En un entorno JVM se verían excepciones tipo FileNotFoundException
      // con payloads de path traversal (../../..). Aquí simulamos el mismo patrón.
      console.error('Error leyendo archivo:', err.message);
      return res.status(404).send('Archivo no encontrado');
    }

    res.type('text/plain').send(data);
  });
});

app.listen(PORT, () => {
  console.log(`Servidor vulnerable escuchando en http://localhost:${PORT}`);
});
