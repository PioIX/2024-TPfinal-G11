const express = require('express');               
const bodyParser = require('body-parser');        
const session = require('express-session');       
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const crypto = require('crypto');
const MySQL = require('./modulos/mysql');  // Archivo MySQL personalizado

const app = express();
const server = http.createServer(app);
const LISTEN_PORT = 4000;  // Puerto del backend
const io = socketIO(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"],  
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    },
});






// Middleware básico
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());



// Middleware de sesión
const sessionMiddleware = session({
    secret: "supersarasa",  // Cambiar por un valor seguro
    resave: false,
    saveUninitialized: false,
});
app.use(sessionMiddleware);

// Vincular sesiones a Socket.IO
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Conexión MySQL
const db = require('./db/connection');

// Helpers para autenticación
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

// Rutas de autenticación

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const passwordHash = hashPassword(password);  // Hash de la contraseña

    try {
        // Verifica si ya existe un usuario con ese email
        const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Inserta el nuevo usuario en la base de datos
        const result = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
            [username, email, passwordHash]
        );

        const userId = result.insertId;  // Obtén el ID del nuevo usuario

        // Genera un token de sesión para el usuario registrado
        const token = generateToken();
        await db.query('INSERT INTO sessions (user_id, token) VALUES (?, ?)', [userId, token]);

        res.status(201).json({ token });  // Devuelve el token al cliente
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const passwordHash = hashPassword(password);

    const [users] = await db.query('SELECT id FROM users WHERE email = ? AND password_hash = ?', 
    [email, passwordHash]);

    if (users.length === 0) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken();
    await db.query('INSERT INTO sessions (user_id, token) VALUES (?, ?)', [users[0].id, token]);

    res.json({ token });
});

app.post('/pins', async (req, res) => {
    const { title, image_base64 } = req.body;
  
    if (!title || !image_base64) {
      return res.status(400).json({ error: 'Título e imagen son requeridos' });
    }
  
    try {
      const result = await db.query(
        'INSERT INTO pins (title, image_url, likes) VALUES (?, ?, ?)',
        [title, image_base64, 0] // Almacena el Base64 en la columna image_url
      );
  
      const newPin = {
        id: result.insertId,
        title,
        image_url: image_base64,
        likes: 0,
      };
  
      res.status(201).json(newPin); // Devuelve el nuevo pin
    } catch (error) {
      console.error('Error al crear pin:', error);
      res.status(500).json({ error: 'Error al crear pin' });
    }
  });
  

// Middleware de autenticación basado en token
async function authenticate(req, res, next) {
    const token = req.headers.authorization;
    const [sessions] = await db.query('SELECT user_id FROM sessions WHERE token = ?', [token]);

    if (sessions.length === 0) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    req.userId = sessions[0].user_id;
    next();
}

// Ruta protegida
app.get('/protected', authenticate, (req, res) => {
    res.json({ message: `Hola, usuario ${req.userId}` });
});

// Rutas de ejemplo y control de estado del servidor
app.get('/', (req, res) => {
    console.log(`[REQUEST - ${req.method}] ${req.url}`);
    res.send('Servidor funcionando');
});

// Integración con Socket.IO
io.on("connection", (socket) => {
    const req = socket.request;

    console.log('Cliente conectado');

    // Unirse a una sala
    socket.on('joinRoom', (data) => {
        if (req.session.room) {
            socket.leave(req.session.room);
        }
        req.session.room = data.room;
        socket.join(req.session.room);

        io.to(req.session.room).emit('chat-messages', { user: req.session.user, room: req.session.room });
    });

    // Evento de "like" a un pin
    socket.on('like_pin', async (pinId) => {
        await db.query('UPDATE pins SET likes = likes + 1 WHERE id = ?', [pinId]);
        io.emit('update_likes', { pinId });
    });

    // Enviar mensaje a la sala
    socket.on('sendMessage', (data) => {
        io.to(req.session.room).emit('newMessage', { room: req.session.room, message: data });
    });

    // Evento global "pingAll"
    socket.on('pingAll', (data) => {
        io.emit('pingAll', { event: "Ping to all", message: data });
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});
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
  

// Iniciar el servidor
server.listen(LISTEN_PORT, () => {
    console.log(`Servidor NodeJS corriendo en http://localhost:${LISTEN_PORT}/`);
});
