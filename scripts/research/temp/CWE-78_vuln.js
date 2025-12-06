const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

// Endpoint vulnerable a OS Command Injection
app.get('/list-files', (req, res) => {
  const dir = req.query.dir || '.'; // valor controlado por el usuario

  // VULNERABLE: concatenación directa del input del usuario en el comando
  const cmd = `ls -la ${dir}`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Error ejecutando comando: ${stderr}`);
    }
    res.type('text/plain').send(stdout);
  });
});

app.listen(3000, () => {
  console.log('Servidor vulnerable escuchando en http://localhost:3000');
});
