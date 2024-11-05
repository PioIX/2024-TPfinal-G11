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
app.use(cors());

const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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
  try {
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, password]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.query(
      'SELECT id FROM users WHERE email = ? AND password_hash = ?',
      [email, password]
    );
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

// Obtener todos los pins
app.get('/pins', async (req, res) => {
  try {
    const [pins] = await db.query('SELECT * FROM pins');
    res.json(pins);
  } catch (error) {
    console.error('Error al cargar pins:', error);
    res.status(500).json({ error: 'Error al cargar pins' });
  }
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' })); // Cambia a 2mb o el tamaño que desees
app.use(bodyParser.json({ limit: '10mb' })); // Cambia a 2mb o el tamaño que desees


// Crear un nuevo pin
app.post('/pins', async (req, res) => {
  const { title, image_base64, userID, description } = req.body;
  if (!title || !image_base64 || !description) {
    return res.status(400).json({ error: 'Título e imagen son requeridos' });
  }
  try {
    const result = await db.query(
      'INSERT INTO pins (title, image_url, user_id, description) VALUES (?, ?, ?, ?)',
      [title, image_base64, userID, description]
    );
    const newPin = {
      id: result.insertId,
      title,
      image_url: image_base64,
      description,
    };
    res.status(201).json(newPin);
  } catch (error) {
    console.error('Error al crear pin:', error);
    res.status(500).json({ error: 'Error al crear pin' });
  }
});

// Obtener un pin específico por ID
app.get('/pins/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [pin] = await db.query('SELECT * FROM pins WHERE id = ?', [id]);
    if (pin.length === 0) {
      return res.status(404).json({ error: 'Pin no encontrado' });
    }
    res.json(pin[0]); // Devuelve el primer pin encontrado
  } catch (error) {
    console.error('Error al cargar el pin:', error);
    res.status(500).json({ error: 'Error al cargar el pin' });
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


// Ruta para registrar un "like"
app.post('/likes', async (req, res) => {
  const { pin_id, user_id } = req.body;

  try {
    // Verificar si ya existe un like de este usuario en este pin
    const [existingLike] = await db.query(
      'SELECT * FROM likes WHERE pin_id = ? AND user_id = ?',
      [pin_id, user_id]
    );

    if (existingLike) {
      // Si el usuario ya dio like, eliminar el like (like toggle)
      await db.query('DELETE FROM likes WHERE pin_id = ? AND user_id = ?', [pin_id, user_id]);
      return res.json({ message: 'Like eliminado' });
    }

    // Si no existe, agregar un nuevo like
    await db.query('INSERT INTO likes (pin_id, user_id) VALUES (?, ?)', [
      pin_id,
      user_id,
    ]);
    res.json({ message: 'Like agregado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al procesar el like' });
  }
});
