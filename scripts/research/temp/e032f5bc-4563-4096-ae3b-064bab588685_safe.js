const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Directorio base permitido para lectura
const BASE_DIR = path.join(__dirname, 'public_files');

// Asegurarse de que el directorio exista
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

// Ruta segura: sólo permite leer archivos dentro de BASE_DIR
app.get('/read-file', (req, res) => {
  const userFile = req.query.file;

  if (!userFile || typeof userFile !== 'string') {
    return res.status(400).send('Parámetro "file" inválido');
  }

  // Normalizar el path y evitar traversal
  const normalized = path.normalize(userFile).replace(/^([/\\])+/, '');

  // Construir la ruta final dentro del directorio permitido
  const requestedPath = path.join(BASE_DIR, normalized);

  // Verificar que la ruta resultante siga dentro de BASE_DIR
  if (!requestedPath.startsWith(BASE_DIR + path.sep)) {
    return res.status(403).send('Acceso denegado');
  }

  fs.readFile(requestedPath, 'utf8', (err, data) => {
    if (err) {
      // No exponemos rutas internas ni detalles sensibles del sistema de archivos
      console.error('Error leyendo archivo seguro:', err.message);
      return res.status(404).send('Archivo no encontrado');
    }

    res.type('text/plain').send(data);
  });
});

app.listen(PORT, () => {
  console.log(`Servidor seguro escuchando en http://localhost:${PORT}`);
});
