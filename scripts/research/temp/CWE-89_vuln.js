const express = require('express');
const mysql = require('mysql2');

const app = express();
app.use(express.json());

// Conexión a la base de datos (ejemplo simple)
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'testdb'
});

// ENDPOINT VULNERABLE A SQL INJECTION
app.get('/user', (req, res) => {
  const userId = req.query.id; // Entrada controlada por el usuario

  // VULNERABLE: concatenación directa de la entrada en la query
  const query = "SELECT * FROM users WHERE id = " + userId;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }

    res.json(results);
  });
});

app.listen(3000, () => {
  console.log('Servidor vulnerable escuchando en el puerto 3000');
});
