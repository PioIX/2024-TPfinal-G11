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

// Iniciar servidor
server.listen(LISTEN_PORT, () => {
  console.log(`Servidor NodeJS corriendo en http://localhost:${LISTEN_PORT}/`);
});

//REGISTRARSE
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

//LOGIN
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



//OBTENER PINS
app.get('/pins', async (req, res) => {
  try {
    const [pins] = await db.query(`
      SELECT p.*, u.username, 
        (SELECT COUNT(*) FROM likes l WHERE l.pin_id = p.id) AS like_count
      FROM pins p
      JOIN users u ON p.user_id = u.id
    `);
    res.json(pins);
  } catch (error) {
    console.error('Error al cargar pins:', error);
    res.status(500).json({ error: 'Error al cargar pins' });
  }
});


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


// TAMAÑO DE LAS IMAGENES NO ANDA:(
app.use(express.json({ limit: '100mb' }));  // Para el JSON
app.use(express.urlencoded({ extended: false, limit: '100mb' })); // Para formularios

//AGREGAR PINS
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


//LIKES
app.post('/likes', async (req, res) => {
  const { pin_id, user_id } = req.body;

  try {
    const [existingLike] = await db.query(
      'SELECT * FROM likes WHERE pin_id = ? AND user_id = ?',
      [pin_id, user_id]
    );

    if (existingLike.length > 0) {
      const newLikeStatus = existingLike[0].liked ? false : true; 
      await db.query(
        'UPDATE likes SET liked = ? WHERE pin_id = ? AND user_id = ?',
        [newLikeStatus, pin_id, user_id]
      );
      return res.json({ message: newLikeStatus ? 'Like agregado' : 'Like eliminado' });
    }

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

//SACAR LIKE
app.delete('/likes', async (req, res) => {
  const { pin_id, user_id } = req.body;

  try {
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


// OBTENER ESTADO LIKE
app.get('/likes', (req, res) => {
  const { pin_id, user_id } = req.query;

  if (!pin_id || !user_id) {
    return res.status(400).json({ error: 'Faltan parámetros pin_id o user_id' });
  }

  const query = `
    SELECT EXISTS (
      SELECT 1 FROM likes WHERE pin_id = ? AND user_id = ?
    ) AS \`exists\`
  `;

  db.query(query, [pin_id, user_id], (err, results) => {
    if (err) {
      console.error('Error en la base de datos:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    res.json({ exists: !!results[0].exists });
  });
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

    let likeStatus = false; 

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


//TABLEROS
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

//AGREGAR COMENTARIOS
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






//COMENTARIOS CONECCION
io.on('connection', (socket) => {
  console.log('Cliente conectado');


  socket.on('send-comment', async commentData => {

    console.log(commentData);
    try {
      const result = await db.query(
        `INSERT INTO comments (pin_id, user_id, comment_text) VALUES (${commentData.pin_id}, ${commentData.user_id}, '${commentData.comment_text}')`
      );
      const newComment = {
        id: result.id,
        pin_id: commentData.pin_id,
        user_id: commentData.user_id, 
        comment_text: commentData.comment_text,
        created_at: new Date().toISOString()
      };

    
      io.emit('new-comment', newComment);
    } catch (error) {
      console.error('Error al agregar comentario:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// COMENTARIOS POR PINS
app.get('/pins/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const [comments] = await db.query(`
      SELECT c.*, u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.pin_id = ?
    `, [id]);
    res.json(comments);
  } catch (error) {
    console.error('Error al cargar los comentarios:', error);
    res.status(500).json({ error: 'Error al cargar los comentarios' });
  }
});


//ELIMINAR PINS 
const correctPassword = "ICONIC"; // Contraseña secreta para eliminar pines

// Ruta para eliminar un pin
app.delete('/pins/:id', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;  // La contraseña enviada desde el cliente
  
  if (password !== correctPassword) {
    return res.status(403).json({ error: 'Contraseña incorrecta.' });
  }

  try {
    const result = await pool.query('DELETE FROM pins WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pin no encontrado.' });
    }

    res.status(200).json({ message: 'Pin eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar pin:', error);
    res.status(500).json({ error: 'Hubo un error al eliminar el pin.' });
  }
});