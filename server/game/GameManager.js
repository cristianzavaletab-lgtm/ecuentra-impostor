// server/game/GameManager.js
class GameManager {
    constructor() {
        this.rooms = new Map();
        this.categories = this.loadCategories();
    }

    loadCategories() {
        return {
            'comida': ['Pizza', 'Hamburguesa', 'Taco', 'Sushi', 'Pasta', 'Ensalada'],
            'futbol': ['Messi', 'Ronaldo', 'Neymar', 'Mbappé', 'Haaland', 'Benzema'],
            'paises': ['México', 'España', 'Argentina', 'Brasil', 'Francia', 'Italia'],
            // ... más categorías
        };
    }

    createRoom(hostPlayer) {
        const roomCode = this.generateRoomCode();
        const room = {
            code: roomCode,
            players: [hostPlayer],
            host: hostPlayer.id,
            status: 'waiting',
            category: null,
            impostor: null,
            gameState: {}
        };
        
        this.rooms.set(roomCode, room);
        return room;
    }

    generateRoomCode() {
        return Math.random().toString(36).substring(2, 6).toUpperCase();
    }

    joinRoom(roomCode, player) {
        const room = this.rooms.get(roomCode);
        if (room && room.status === 'waiting') {
            room.players.push(player);
            return room;
        }
        return null;
    }

    startGame(roomCode) {
        const room = this.rooms.get(roomCode);
        if (room && room.players.length >= 4) {
            room.status = 'playing';
            this.assignRoles(room);
            return room;
        }
        return null;
    }

    assignRoles(room) {
        const players = room.players;
        const impostorIndex = Math.floor(Math.random() * players.length);
        
        players.forEach((player, index) => {
            if (index === impostorIndex) {
                player.role = 'impostor';
                player.word = '???';
            } else {
                player.role = 'crewmate';
                // Asignar palabra real de la categoría
            }
        });
        
        room.impostor = players[impostorIndex].id;
    }
}

module.exports = GameManager;