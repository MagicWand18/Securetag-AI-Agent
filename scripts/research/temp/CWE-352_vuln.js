const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Simulación de "sesión" muy básica
const users = {
  '1': { id: '1', name: 'Alice', email: 'alice@example.com' }
};

// Ruta de login muy simplificada (NO usar en producción)
app.post('/login', (req, res) => {
  const { userId } = req.body;
  if (!users[userId]) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  // Marca al usuario como "logueado" mediante una cookie simple
  res.cookie('userId', userId, { httpOnly: false }); // Inseguro, pero usado aquí para simplificar el ejemplo
  res.json({ message: 'Login exitoso' });
});

// Ruta que CAMBIA el estado del usuario (actualiza el email)
// VULNERABLE: No verifica ningún token CSRF, solo confía en la cookie de sesión
app.post('/user/email', (req, res) => {
  const userId = req.cookies && req.cookies.userId;
  const { newEmail } = req.body;

  if (!userId || !users[userId]) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (!newEmail) {
    return res.status(400).json({ error: 'Falta newEmail' });
  }

  // Cambio de estado sin protección CSRF
  users[userId].email = newEmail;
  res.json({ message: 'Email actualizado', user: users[userId] });
});

app.listen(3000, () => {
  console.log('Servidor vulnerable escuchando en http://localhost:3000');
});
