const express = require('express');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());

// Lista blanca opcional de directorios permitidos (ejemplo)
const ALLOWED_DIRS = [
  path.resolve('.'),
  path.resolve('./logs'),
  path.resolve('./uploads')
];

function isAllowedDir(dir) {
  const resolved = path.resolve(dir);
  return ALLOWED_DIRS.some(allowed => resolved === allowed || resolved.startsWith(allowed + path.sep));
}

// Endpoint seguro que evita OS Command Injection
app.get('/list-files', (req, res) => {
  const dir = req.query.dir || '.';
  const resolvedDir = path.resolve(dir);

  // Validación estricta del input
  if (!isAllowedDir(resolvedDir)) {
    return res.status(400).json({ error: 'Directorio no permitido' });
  }

  // USO SEGURO: execFile con argumentos separados, sin concatenación de strings
  execFile('ls', ['-la', resolvedDir], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Error ejecutando comando: ${stderr}`);
    }
    res.type('text/plain').send(stdout);
  });
});

app.listen(3000, () => {
  console.log('Servidor seguro escuchando en http://localhost:3000');
});
