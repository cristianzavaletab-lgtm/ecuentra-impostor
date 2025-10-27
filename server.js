const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('client'));
app.use('/public', express.static('public'));

// Variables del juego
const rooms = new Map();
const players = new Map();

// Categorías del juego
const categories = {
    futbol: ['Messi', 'Cristiano Ronaldo', 'Neymar', 'Mbappé', 'Haaland', 'Benzema', 'Lewandowski', 'De Bruyne'],
    comida: ['Pizza', 'Hamburguesa', 'Taco', 'Sushi', 'Pasta', 'Ceviche', 'Paella', 'Ramen'],
    paises: ['Perú', 'Brasil', 'Argentina', 'España', 'Francia', 'Japón', 'Italia', 'Alemania'],
    peliculas: ['Avengers', 'Titanic', 'Star Wars', 'Harry Potter', 'Inception', 'Matrix', 'Avatar', 'Gladiador'],
    animales: ['León', 'Tigre', 'Elefante', 'Delfín', 'Águila', 'Panda', 'Lobo', 'Jirafa'],
    profesiones: ['Doctor', 'Ingeniero', 'Profesor', 'Chef', 'Piloto', 'Arquitecto', 'Abogado', 'Designer'],
    marcas: ['Apple', 'Samsung', 'Nike', 'Adidas', 'Coca-Cola', 'McDonald\'s', 'Amazon', 'Google'],
    videojuegos: ['Mario', 'Sonic', 'Pikachu', 'Link', 'Minecraft', 'Fortnite', 'Among Us', 'Roblox']
};

// Función para generar código de sala
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Función para asignar roles - CORREGIDA
function assignRoles(room) {
    const category = room.category;
    
    // Verificar si la categoría existe
    if (!categories[category]) {
        console.error('Categoría no encontrada:', category);
        room.category = 'comida';
    }
    
    const words = [...categories[room.category]];
    const playersList = Array.from(room.players.values());
    
    // Seleccionar UNA palabra aleatoria para TODOS los jugadores normales
    const randomWord = words[Math.floor(Math.random() * words.length)];
    
    // Seleccionar impostores
    const numImpostors = room.numImpostors;
    const impostorIndices = [];
    while (impostorIndices.length < numImpostors) {
        const randomIndex = Math.floor(Math.random() * playersList.length);
        if (!impostorIndices.includes(randomIndex)) {
            impostorIndices.push(randomIndex);
        }
    }
    
    // Asignar la MISMA palabra a todos (excepto impostores)
    playersList.forEach((player, index) => {
        if (impostorIndices.includes(index)) {
            player.role = '???';
            player.isImpostor = true;
        } else {
            player.role = randomWord; // Todos reciben la misma palabra
            player.isImpostor = false;
        }
        player.hasDescribed = false;
        player.votes = 0;
        player.hasVoted = false;
    });
    
    console.log(`Palabra asignada: ${randomWord}, Impostores: ${impostorIndices.length}`);
}

// Socket.IO - Manejo de conexiones
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);
    
    // Crear sala
    socket.on('createRoom', (data) => {
        const roomCode = generateRoomCode();
        const room = {
            code: roomCode,
            host: socket.id,
            players: new Map(),
            category: data.category || 'comida',
            numImpostors: 1,
            maxPlayers: data.maxPlayers || 8,
            gameState: 'waiting',
            currentPlayerIndex: 0,
            turnTimer: null
        };
        
        rooms.set(roomCode, room);
        socket.join(roomCode);
        
        const player = {
            id: socket.id,
            nickname: data.nickname,
            room: roomCode,
            isHost: true,
            score: 0,
            xp: 0
        };
        
        room.players.set(socket.id, player);
        players.set(socket.id, player);
        
        socket.emit('roomCreated', { roomCode, player });
        io.to(roomCode).emit('playersUpdate', Array.from(room.players.values()));
    });
    
    // Unirse a sala
    socket.on('joinRoom', (data) => {
        const room = rooms.get(data.roomCode);
        
        if (!room) {
            socket.emit('error', { message: 'Sala no encontrada' });
            return;
        }
        
        if (room.players.size >= room.maxPlayers) {
            socket.emit('error', { message: 'Sala llena' });
            return;
        }
        
        if (room.gameState !== 'waiting') {
            socket.emit('error', { message: 'Partida en curso' });
            return;
        }
        
        socket.join(data.roomCode);
        
        const player = {
            id: socket.id,
            nickname: data.nickname,
            room: data.roomCode,
            isHost: false,
            score: 0,
            xp: 0
        };
        
        room.players.set(socket.id, player);
        players.set(socket.id, player);
        
        socket.emit('roomJoined', { roomCode: data.roomCode, player });
        io.to(data.roomCode).emit('playersUpdate', Array.from(room.players.values()));
    });
    
    // Iniciar juego
    socket.on('startGame', (data) => {
        const room = rooms.get(data.roomCode);
        
        if (!room || room.host !== socket.id) {
            socket.emit('error', { message: 'No tienes permiso' });
            return;
        }
        
        if (room.players.size < 4) {
            socket.emit('error', { message: 'Se necesitan mínimo 4 jugadores' });
            return;
        }
        
        // Asegurarse de que la categoría existe
        const selectedCategory = data.category || 'comida';
        if (!categories[selectedCategory]) {
            room.category = 'comida';
        } else {
            room.category = selectedCategory;
        }
        
        // Configurar número de impostores
        room.numImpostors = room.players.size > 5 ? (data.numImpostors || 2) : 1;
        
        console.log('Iniciando juego con categoría:', room.category);
        
        // Asignar roles
        assignRoles(room);
        room.gameState = 'describing';
        room.currentPlayerIndex = 0;
        
        // Enviar roles a cada jugador
        room.players.forEach((player, playerId) => {
            io.to(playerId).emit('gameStarted', {
                role: player.role,
                isImpostor: player.isImpostor,
                category: room.category
            });
        });
        
        // Iniciar primer turno
        startTurn(room);
    });
    
    // Descripción del jugador
    socket.on('sendDescription', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(player.room);
        if (!room) return;
        
        const currentPlayer = room.players.get(socket.id);
        if (currentPlayer) {
            currentPlayer.hasDescribed = true;
        }
        
        io.to(player.room).emit('playerDescription', {
            playerId: socket.id,
            nickname: player.nickname,
            description: data.description
        });
    });
    
    // Votar
    socket.on('vote', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(player.room);
        if (!room || room.gameState !== 'voting') return;
        
        const votedPlayer = room.players.get(data.votedPlayerId);
        if (votedPlayer) {
            votedPlayer.votes = (votedPlayer.votes || 0) + 1;
        }
        
        const currentPlayer = room.players.get(socket.id);
        if (currentPlayer) {
            currentPlayer.hasVoted = true;
        }
        
        // Verificar si todos votaron
        const allVoted = Array.from(room.players.values()).every(p => p.hasVoted);
        if (allVoted) {
            endGame(room);
        }
    });
    
    // Desconexión
    socket.on('disconnect', () => {
        const player = players.get(socket.id);
        if (player) {
            const room = rooms.get(player.room);
            if (room) {
                room.players.delete(socket.id);
                
                if (room.host === socket.id && room.players.size > 0) {
                    const newHost = Array.from(room.players.keys())[0];
                    room.host = newHost;
                    room.players.get(newHost).isHost = true;
                }
                
                if (room.players.size === 0) {
                    rooms.delete(player.room);
                } else {
                    io.to(player.room).emit('playersUpdate', Array.from(room.players.values()));
                }
            }
            players.delete(socket.id);
        }
        console.log('Jugador desconectado:', socket.id);
    });
});

// Función para iniciar turno
function startTurn(room) {
    const playersList = Array.from(room.players.values());
    const currentPlayer = playersList[room.currentPlayerIndex];
    
    io.to(room.code).emit('turnStart', {
        playerId: currentPlayer.id,
        nickname: currentPlayer.nickname,
        turnNumber: room.currentPlayerIndex + 1,
        totalPlayers: playersList.length
    });
    
    // Timer de 30 segundos
    room.turnTimer = setTimeout(() => {
        room.currentPlayerIndex++;
        
        if (room.currentPlayerIndex >= playersList.length) {
            // Todos describieron, iniciar votación
            room.gameState = 'voting';
            io.to(room.code).emit('votingPhase', {
                players: playersList.map(p => ({ id: p.id, nickname: p.nickname }))
            });
            
            // Timer de votación (15 segundos)
            setTimeout(() => {
                endGame(room);
            }, 15000);
        } else {
            startTurn(room);
        }
    }, 30000);
}

// Función para terminar el juego
function endGame(room) {
    const playersList = Array.from(room.players.values());
    
    // Encontrar al más votado
    let mostVoted = playersList[0];
    playersList.forEach(player => {
        if ((player.votes || 0) > (mostVoted.votes || 0)) {
            mostVoted = player;
        }
    });
    
    // Verificar si acertaron
    const impostors = playersList.filter(p => p.isImpostor);
    const guessedCorrectly = mostVoted.isImpostor;
    
    // Asignar XP
    playersList.forEach(player => {
        if (player.isImpostor && !guessedCorrectly) {
            player.xp += 150;
            player.score += 3;
        } else if (!player.isImpostor && guessedCorrectly) {
            player.xp += 100;
            player.score += 2;
        } else {
            player.xp += 50;
        }
    });
    
    room.gameState = 'ended';
    
    io.to(room.code).emit('gameEnded', {
        impostors: impostors.map(p => ({ id: p.id, nickname: p.nickname })),
        mostVoted: { id: mostVoted.id, nickname: mostVoted.nickname, votes: mostVoted.votes },
        guessedCorrectly,
        players: playersList
    });
    
    // Resetear sala después de 10 segundos
    setTimeout(() => {
        room.gameState = 'waiting';
        room.currentPlayerIndex = 0;
        io.to(room.code).emit('playersUpdate', Array.from(room.players.values()));
    }, 10000);
}

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 Servidor corriendo en http://localhost:${PORT}`);
});