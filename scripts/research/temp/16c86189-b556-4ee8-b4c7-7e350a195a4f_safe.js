const express = require('express');
const bodyParser = require('body-parser');
const { Velocity } = require('velocityjs');

const app = express();
app.use(bodyParser.json());

// Safe: do NOT accept arbitrary templates from the user.
// Use a server-side template (constant) and only interpolate validated data.
const TEMPLATE = 'Hello $name';

function sanitizeName(input) {
  const s = String(input ?? 'world');
  // Allow only a conservative character set for demo purposes
  if (!/^[a-zA-Z0-9 _-]{1,50}$/.test(s)) return 'world';
  return s;
}

app.post('/render', (req, res) => {
  const context = {
    name: sanitizeName(req.body.name)
    // Do not expose process/require or other sensitive objects to the template context.
  };

  try {
    const output = Velocity.render(TEMPLATE, context);
    res.type('text/plain').send(output);
  } catch (e) {
    // Avoid leaking internal error details
    console.error('Velocity render failed:', e);
    res.status(500).send('Internal error');
  }
});

app.listen(3000, () => console.log('Listening on :3000'));
