const express = require('express');
const bodyParser = require('body-parser');
const { Velocity } = require('velocityjs');

const app = express();
app.use(bodyParser.json());

// Vulnerable: renders user-controlled template content directly.
// If parsing fails, Velocity may throw: ParseErrorException / VelocityException / TemplateInitException.
app.post('/render', (req, res) => {
  const userTemplate = String(req.body.template || 'Hello $name');
  const context = {
    name: String(req.body.name || 'world'),
    // Exposing powerful objects makes exploitation worse if the engine allows access.
    process,
    require
  };

  try {
    const output = Velocity.render(userTemplate, context);
    res.type('text/plain').send(output);
  } catch (e) {
    // Typical pattern SAST rules look for around Velocity rendering failures
    console.error('VelocityException:', e);
    res.status(400).send('Template error: ' + e.message);
  }
});

app.listen(3000, () => console.log('Listening on :3000'));
