const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');

// Versión segura: sólo se usan plantillas predefinidas y se valida el input

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Catálogo de plantillas Velocity predefinidas (no controladas por el usuario)
// El usuario sólo puede elegir una clave segura, no modificar el contenido de la plantilla.
const TEMPLATE_CATALOG = {
  'welcome': 'Hello, $name! Welcome to our site.',
  'goodbye': 'Goodbye, $name! See you soon.'
};

function renderVelocityTemplateSafe(templateKey, data, callback) {
  const templateString = TEMPLATE_CATALOG[templateKey];
  if (!templateString) {
    return callback(new Error('Template not found'));
  }

  const jarPath = './velocity-renderer.jar';
  const child = spawn('java', ['-jar', jarPath, templateString, JSON.stringify(data)]);

  let output = '';
  let errorOutput = '';

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    errorOutput += chunk.toString();
  });

  child.on('close', (code) => {
    if (code !== 0) {
      // Se registra el error internamente, pero no se expone el detalle al usuario
      console.error('Velocity rendering error:', errorOutput);
      return callback(new Error('Template rendering failed'));
    }
    callback(null, output);
  });
}

// Ruta SEGURA: el usuario sólo elige una plantilla predefinida y datos simples
app.post('/preview', (req, res) => {
  const templateKey = req.body.templateKey; // p.ej. "welcome" o "goodbye"
  const userName = (req.body.name || 'Invitado').toString();

  // Saneamos el nombre para evitar inyección en el contexto (aunque Velocity ya lo trate como dato)
  const sanitizedName = userName.replace(/[<>$#{}]/g, '');

  const data = { name: sanitizedName };

  renderVelocityTemplateSafe(templateKey, data, (err, html) => {
    if (err) {
      // No devolvemos mensajes de error internos de Velocity (ParseErrorException, etc.)
      return res.status(500).send('Error al procesar la solicitud.');
    }
    res.send(html);
  });
});

app.listen(3001, () => {
  console.log('Servidor seguro escuchando en http://localhost:3001');
});
