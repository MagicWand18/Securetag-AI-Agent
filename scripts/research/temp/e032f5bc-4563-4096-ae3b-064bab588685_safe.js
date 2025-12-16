const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const BASE_DIR = path.resolve(__dirname, 'public_files');

// Safe: restrict reads to a fixed base directory and validate the resolved path
app.get('/read', (req, res) => {
  const file = req.query.file; // expected: a simple filename like "report.txt"
  if (!file) return res.status(400).send('Missing file parameter');

  // Basic allowlist: only filenames (no slashes, no traversal)
  if (!/^[a-zA-Z0-9._-]+$/.test(file)) {
    return res.status(400).send('Invalid file name');
  }

  const resolved = path.resolve(BASE_DIR, file);

  // Enforce that the resolved path stays within BASE_DIR
  if (!resolved.startsWith(BASE_DIR + path.sep)) {
    return res.status(403).send('Access denied');
  }

  fs.readFile(resolved, 'utf8', (err, data) => {
    if (err) {
      // Avoid echoing attacker-controlled paths in error messages
      return res.status(404).send('File not found');
    }
    res.type('text/plain').send(data);
  });
});

app.listen(3000, () => console.log('Listening on http://localhost:3000'));
