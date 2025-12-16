const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Vulnerable: reads a file path directly from user input (path traversal)
app.get('/read', (req, res) => {
  const file = req.query.file; // e.g. ?file=../../../../etc/passwd
  if (!file) return res.status(400).send('Missing file parameter');

  // Naively join without enforcing a base directory
  const targetPath = path.join(__dirname, file);

  fs.readFile(targetPath, 'utf8', (err, data) => {
    if (err) {
      // In JVM apps this often shows up as FileNotFoundException; here we leak the user-controlled path in the error
      return res.status(404).send(`FileNotFoundException: ${targetPath}`);
    }
    res.type('text/plain').send(data);
  });
});

app.listen(3000, () => console.log('Listening on http://localhost:3000'));
