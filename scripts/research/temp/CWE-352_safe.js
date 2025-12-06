const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const csurf = require('csurf');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

// Sesiones de servidor (en memoria para el ejemplo)
app.use(session({
  secret: 'cambio-esto-en-produccion',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// Middleware CSRF: genera y valida tokens
const csrfProtection = csurf({ cookie: false });

const users = {
  '1': { id: '1', name: 'Alice', email: 'alice@example.com' }
};

// Ruta de login muy simplificada
app.post('/login', (req, res) => {
  const { userId } = req.body;
  if (!users[userId]) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  // Guarda el usuario en la sesión del servidor
  req.session.userId = userId;
  res.json({ message: 'Login exitoso' });
});

// Ruta para obtener un token CSRF para el cliente (por ejemplo, SPA)
app.get('/csrf-token', csrfProtection, (req, res) => {
  // El cliente debe enviar este token en las peticiones de cambio de estado
  res.json({ csrfToken: req.csrfToken() });
});

// Ruta que CAMBIA el estado del usuario (actualiza el email)
// SEGURA: Requiere un token CSRF válido
app.post('/user/email', csrfProtection, (req, res) => {
  const userId = req.session.userId;
  const { newEmail } = req.body;

  if (!userId || !users[userId]) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (!newEmail) {
    return res.status(400).json({ error: 'Falta newEmail' });
  }

  // Cambio de estado protegido por CSRF
  users[userId].email = newEmail;
  res.json({ message: 'Email actualizado', user: users[userId] });
});

app.listen(3000, () => {
  console.log('Servidor seguro escuchando en http://localhost:3000');
});
