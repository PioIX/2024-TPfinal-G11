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




app.get('/pins', async (req, res) => {
  try {
    const [pins] = await db.query(`
      SELECT p.*, u.username 
      FROM pins p
      JOIN users u ON p.user_id = u.id
    `);
    res.json(pins);
  } catch (error) {
    console.error('Error al cargar pins:', error);
    res.status(500).json({ error: 'Error al cargar pins' });
  }
});



app.use(express.json({ limit: '100mb' }));  // Para el JSON
app.use(express.urlencoded({ extended: false, limit: '100mb' })); // Para formularios


// Crear un nuevo pin
app.post('/pins', async (req, res) => {
  const { title, image_base64, userID, description, category } = req.body;
  if (!title || !image_base64 || !description || !category) {
    return res.status(400).json({ error: 'Título, imagen, descripción y categoría son requeridos' });
  }
  try {
    const result = await db.query(
      'INSERT INTO pins (title, image_url, user_id, description, category) VALUES (?, ?, ?, ?, ?)',
      [title, image_base64, userID, description, category]
    );
    const newPin = {
      id: result.insertId,
      title,
      image_url: image_base64,
      description,
      category,
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
    const [pin] = await db.query(`
      SELECT pins.*, users.username 
      FROM pins 
      JOIN users ON pins.user_id = users.id 
      WHERE pins.id = ?
    `, [id]);
    if (pin.length === 0) {
      return res.status(404).json({ error: 'Pin no encontrado' });
    }
    res.json(pin[0]);
  } catch (error) {
    console.error('Error al cargar el pin:', error);
    res.status(500).json({ error: 'Error al cargar el pin' });
  }
});


// Iniciar servidor
server.listen(LISTEN_PORT, () => {
  console.log(`Servidor NodeJS corriendo en http://localhost:${LISTEN_PORT}/`);
});



// Ruta para agregar o quitar un like
app.post('/likes', async (req, res) => {
  const { pin_id, user_id } = req.body;

  try {
    // Verificar si ya existe un like para este pin y usuario
    const [existingLike] = await db.query(
      'SELECT * FROM likes WHERE pin_id = ? AND user_id = ?',
      [pin_id, user_id]
    );

    if (existingLike.length > 0) {
      // Si ya existe el like, actualizarlo para alternar entre like y dislike
      const newLikeStatus = existingLike[0].liked ? false : true; // Alterna entre true y false
      await db.query(
        'UPDATE likes SET liked = ? WHERE pin_id = ? AND user_id = ?',
        [newLikeStatus, pin_id, user_id]
      );
      return res.json({ message: newLikeStatus ? 'Like agregado' : 'Like eliminado' });
    }

    // Si no existe el like, crearlo con el valor 'true' (liked)
    await db.query(
      'INSERT INTO likes (pin_id, user_id, liked) VALUES (?, ?, ?)',
      [pin_id, user_id, true]
    );
    res.json({ message: 'Like agregado' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al manejar el like' });
  }
});


app.delete('/likes', async (req, res) => {
  const { pin_id, user_id } = req.body;

  try {
    // Verificar si el like existe
    const [existingLike] = await db.query('SELECT * FROM likes WHERE pin_id = ? AND user_id = ?', [pin_id, user_id]);
    
    if (existingLike.length === 0) {
      return res.status(400).json({ message: 'No has dado like a este pin' });
    }

    // Eliminar el like
    await db.query('DELETE FROM likes WHERE pin_id = ? AND user_id = ?', [pin_id, user_id]);
    res.json({ message: 'Like eliminado' });
  } catch (error) {
    console.error('Error al eliminar like:', error);
    res.status(500).json({ message: 'Error al eliminar like' });
  }
});



// Socket.IO para manejar el like de un pin
io.on("connection", (socket) => {
  console.log("Cliente conectado");

  socket.on("like_pin", async (pinId, userId) => {
    // Verificar si el like ya existe para este pin y usuario
    const [existingLike] = await db.query(
      'SELECT * FROM likes WHERE pin_id = ? AND user_id = ?',
      [pinId, userId]
    );

    let likeStatus = false; // Default: no like

    if (existingLike.length > 0) {
      // Si existe, alternar entre true y false
      likeStatus = !existingLike[0].liked;
      await db.query(
        'UPDATE likes SET liked = ? WHERE pin_id = ? AND user_id = ?',
        [likeStatus, pinId, userId]
      );
    } else {
      // Si no existe el like, crearlo
      likeStatus = true;
      await db.query(
        'INSERT INTO likes (pin_id, user_id, liked) VALUES (?, ?, ?)',
        [pinId, userId, likeStatus]
      );
    }

    // Emitir evento para actualizar los likes en tiempo real
    io.emit("update_likes", { pinId, likeStatus });
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
  });
});


app.get('/boards', async (req, res) => {
  try {
    const query = `
    SELECT category, JSON_ARRAYAGG(JSON_OBJECT(
      'id', id,
      'title', title,
      'image_url', image_url,
      'description', description,
      'likes', likes,
      'category', category
    )) AS pins
    FROM pins
    GROUP BY category;
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener los tableros');
  }
});

// Ruta para agregar un comentario
app.post('/comments', async (req, res) => {
  const { pin_id, user_id, comment_text } = req.body;

  if (!pin_id || !user_id || !comment_text) {
    return res.status(400).json({ error: 'El pin_id, user_id y comment_text son requeridos' });
  }

  try {
    const result = await db.query(
      'INSERT INTO comments (pin_id, user_id, comment_text) VALUES (?, ?, ?)',
      [pin_id, user_id, comment_text]
    );
    const newComment = {
      id: result.insertId,
      pin_id,
      user_id,
      comment_text,
      created_at: new Date().toISOString()
    };
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({ error: 'Error al agregar comentario' });
  }
});
// Socket.IO para manejar los comentarios
io.on('connection', (socket) => {
  console.log('Cliente conectado');

  // Escuchar evento de nuevo comentario
  socket.on('send-comment', async (pinId, userId, commentText) => {
    // Agregar comentario a la base de datos
    try {
      const result = await db.query(
        'INSERT INTO comments (pin_id, user_id, comment_text) VALUES (?, ?, ?)',
        [pinId, userId, commentText]
      );
      const newComment = {
        id: result.id,
        pin_id: pinId,
        user_id: userId,
        comment_text: commentText,
        created_at: new Date().toISOString()
      };

      // Emitir el nuevo comentario a todos los clientes
      io.emit('new-comment', newComment);
    } catch (error) {
      console.error('Error al agregar comentario:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});
