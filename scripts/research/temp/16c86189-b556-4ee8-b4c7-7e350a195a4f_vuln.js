const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');

// Ejemplo simplificado de integración con un motor Velocity vía proceso externo
// (p.ej. un jar que renderiza plantillas Velocity)

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Función insegura: construye dinámicamente la plantilla Velocity con input del usuario
function renderVelocityTemplateInsecure(templateString, data, callback) {
  // Supongamos que tenemos un jar que lanza el motor Velocity y escribe errores en stderr
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
      // Aquí se podrían ver excepciones típicas de Velocity:
      // ParseErrorException, VelocityException, TemplateInitException, etc.
      console.error('Velocity error:', errorOutput);
      return callback(new Error('VelocityException: ' + errorOutput));
    }
    callback(null, output);
  });
}

// Ruta VULNERABLE: el usuario controla directamente la plantilla Velocity
// Ejemplo de payload malicioso: "#set($x = 'calc.exe') $x" o expresiones más complejas
app.post('/preview', (req, res) => {
  const userTemplate = req.body.template; // input directo del usuario
  const userName = req.body.name || 'Invitado';

  // Mezclamos datos de usuario con la plantilla sin validación ni restricciones
  const data = { name: userName };

  renderVelocityTemplateInsecure(userTemplate, data, (err, html) => {
    if (err) {
      // Devolvemos el error completo al cliente, filtrando mensajes que pueden contener
      // ParseErrorException, VelocityException, TemplateInitException, etc.
      return res.status(500).send('Error al renderizar plantilla: ' + err.message);
    }
    res.send(html);
  });
});

app.listen(3000, () => {
  console.log('Servidor inseguro escuchando en http://localhost:3000');
});
