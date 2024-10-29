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


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
      [username, email, password] // Almacenamiento directo de la contraseña
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
      [email, password] // Comparación directa de contraseña
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    req.session.userId = users[0].id; // Guardar ID de usuario en la sesión
    res.json({ id: users[0].id }); // Enviar ID del usuario al cliente
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});



app.post('/pins', async (req, res) => {
  console.log("[POST] /pins req.body=",req.body);
  const { title, image_base64, userID } = req.body;

  if (!title || !image_base64) {
    return res.status(400).json({ error: 'Título e imagen son requeridos' });
  }

  try {
    const result = await db.query(
      'INSERT INTO pins (title, image_url, user_id) VALUES (?, ?, ?)',
      [title, image_base64, userID]
    );

    const newPin = {
      id: result.insertId,
      title,
      image_url: image_base64,
    };

    res.status(201).json(newPin);
  } catch (error) {
    console.error('Error al crear pin:', error);
    res.status(500).json({ error: 'Error al crear pin' });
  }
});


// Ruta para agregar un comentario
app.post('/comments', async (req, res) => {
  const { pin_id, user_id, content } = req.body;

  if (!pin_id || !user_id || !content) {
    return res.status(400).json({ error: 'Pin, usuario y contenido son requeridos.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO comments (pin_id, user_id, content) VALUES (?, ?, ?)',
      [pin_id, user_id, content]
    );

    const newComment = {
      id: result.insertId,
      pin_id,
      user_id,
      content,
      created_at: new Date(),
    };

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({ error: 'Error al agregar comentario.' });
  }
});
// Ruta para obtener los comentarios de un pin específico
app.get('/pins/:pin_id/comments', async (req, res) => {
  const { pin_id } = req.params;

  try {
    const [comments] = await db.query(
      'SELECT * FROM comments WHERE pin_id = ? ORDER BY created_at DESC',
      [pin_id]
    );
    res.json(comments);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ error: 'Error al obtener comentarios.' });
  }
});



app.get('/pins/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [pin] = await db.query('SELECT * FROM pins WHERE id = ?', [id]);
    if (!pin.length) return res.status(404).json({ error: 'Pin no encontrado' });
    res.json(pin[0]);
  } catch (error) {
    console.error('Error al obtener el pin:', error);
    res.status(500).json({ error: 'Error al obtener el pin' });
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
