const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const db = require('./db/connection');

const app = express();
const server = http.createServer(app);
const LISTEN_PORT = 4000;

const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// Configurar sesión
const sessionMiddleware = session({
  secret: "supersarasa", 
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleware);

// Vincular sesiones a Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});



// Rutas de autenticación
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const passwordHash = hashPassword(password);

  try {
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const userId = result.insertId;
    res.status(201).json({ id: userId });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const passwordHash = hashPassword(password);

  try {
    const [users] = await db.query('SELECT id FROM users WHERE email = ? AND password_hash = ?', [email, passwordHash]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    req.session.userId = users[0].id; 
    res.json({ id: users[0].id });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});


app.post('/pins', async (req, res) => {
  const { title, image_base64 } = req.body;

  if (!title || !image_base64) {
    return res.status(400).json({ error: 'Título e imagen son requeridos' });
  }

  try {
    const result = await db.query(
      'INSERT INTO pins (title, image_url, likes) VALUES (?, ?, ?)',
      [title, image_base64, 0]
    );

    const newPin = {
      id: result.insertId,
      title,
      image_url: image_base64,
      likes: 0,
    };

    res.status(201).json(newPin);
  } catch (error) {
    console.error('Error al crear pin:', error);
    res.status(500).json({ error: 'Error al crear pin' });
  }
});




// Socket.IO
io.on("connection", (socket) => {
  console.log("Cliente conectado");

  socket.on("like_pin", async (pinId) => {
    await db.query('UPDATE pins SET likes = likes + 1 WHERE id = ?', [pinId]);
    io.emit("update_likes", { pinId });
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
  });
});

// Iniciar servidor
server.listen(LISTEN_PORT, () => {
  console.log(`Servidor NodeJS corriendo en http://localhost:${LISTEN_PORT}/`);
});
