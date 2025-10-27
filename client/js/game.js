const socket = io();

// Variables globales
let currentPlayer = null;
let currentRoom = null;
let isHost = false;
let myRole = null;
let isImpostor = false;

// Elementos del DOM
const screens = {
    home: document.getElementById('homeScreen'),
    join: document.getElementById('joinScreen'),
    lobby: document.getElementById('lobbyScreen'),
    game: document.getElementById('gameScreen'),
    voting: document.getElementById('votingScreen'),
    results: document.getElementById('resultsScreen')
};

// Inputs
const nicknameInput = document.getElementById('nicknameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const categorySelect = document.getElementById('categorySelect');
const descriptionInput = document.getElementById('descriptionInput');

// Botones
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const startGameBtn = document.getElementById('startGameBtn');
const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
const sendDescriptionBtn = document.getElementById('sendDescriptionBtn');
const backToLobbyBtn = document.getElementById('backToLobbyBtn');

// Displays
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const playersContainer = document.getElementById('playersContainer');
const roleText = document.getElementById('roleText');
const categoryDisplay = document.getElementById('categoryDisplay');
const currentPlayerName = document.getElementById('currentPlayerName');
const timerDisplay = document.getElementById('timerDisplay');
const chatMessages = document.getElementById('chatMessages');
const votingPlayers = document.getElementById('votingPlayers');
const votingTimer = document.getElementById('votingTimer');
const resultTitle = document.getElementById('resultTitle');
const impostorReveal = document.getElementById('impostorReveal');
const resultsTable = document.getElementById('resultsTable');

// Funciones de navegación
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Event Listeners - Inicio
createRoomBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) {
        alert('Por favor ingresa un nickname');
        return;
    }
    
    socket.emit('createRoom', {
        nickname: nickname,
        maxPlayers: 8
    });
});

joinRoomBtn.addEventListener('click', () => {
    showScreen('join');
});

backToHomeBtn.addEventListener('click', () => {
    showScreen('home');
});

joinGameBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    
    if (!nickname) {
        alert('Por favor ingresa un nickname');
        return;
    }
    
    if (!roomCode) {
        alert('Por favor ingresa el código de sala');
        return;
    }
    
    socket.emit('joinRoom', {
        nickname: nickname,
        roomCode: roomCode
    });
});

startGameBtn.addEventListener('click', () => {
    const category = categorySelect.value;
    console.log('Iniciando con categoría:', category);
    socket.emit('startGame', {
        roomCode: currentRoom,
        category: category,
        numImpostors: 1
    });
});

leaveLobbyBtn.addEventListener('click', () => {
    socket.disconnect();
    socket.connect();
    showScreen('home');
    currentRoom = null;
    isHost = false;
});

sendDescriptionBtn.addEventListener('click', () => {
    const description = descriptionInput.value.trim();
    if (!description) {
        alert('Por favor escribe una descripción');
        return;
    }
    
    socket.emit('sendDescription', {
        description: description
    });
    
    descriptionInput.value = '';
    sendDescriptionBtn.disabled = true;
});

backToLobbyBtn.addEventListener('click', () => {
    showScreen('lobby');
});

// Socket Events
socket.on('roomCreated', (data) => {
    currentPlayer = data.player;
    currentRoom = data.roomCode;
    isHost = true;
    
    roomCodeDisplay.textContent = data.roomCode;
    showScreen('lobby');
    
    document.getElementById('categorySelector').style.display = 'block';
    startGameBtn.style.display = 'block';
});

socket.on('roomJoined', (data) => {
    currentPlayer = data.player;
    currentRoom = data.roomCode;
    isHost = false;
    
    roomCodeDisplay.textContent = data.roomCode;
    showScreen('lobby');
    
    document.getElementById('categorySelector').style.display = 'none';
    startGameBtn.style.display = 'none';
});

socket.on('playersUpdate', (players) => {
    playersContainer.innerHTML = '';
    
    players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card' + (player.isHost ? ' host' : '');
        
        playerCard.innerHTML = `
            <div class="player-avatar">${player.nickname.charAt(0).toUpperCase()}</div>
            <div class="player-nickname">${player.nickname}</div>
            ${player.isHost ? '<span class="player-badge">HOST</span>' : ''}
        `;
        
        playersContainer.appendChild(playerCard);
    });
    
    if (isHost && players.length >= 4) {
        startGameBtn.disabled = false;
    } else if (isHost) {
        startGameBtn.disabled = true;
    }
});

// 🔹 Actualizada: socket.on('gameStarted')
socket.on('gameStarted', (data) => {
    myRole = data.role;
    isImpostor = data.isImpostor;
    
    roleText.textContent = data.role;
    categoryDisplay.textContent = `Categoría: ${getCategoryName(data.category)}`;
    
    if (isImpostor) {
        roleText.style.color = '#ff6b6b';
        roleText.innerHTML = `${data.role}<br><small style="font-size: 0.4em;">🎭 ¡ERES EL IMPOSTOR!</small>`;
        playSound('error');
    } else {
        playSound('success');
    }
    
    chatMessages.innerHTML = '';
    showScreen('game');
});

socket.on('turnStart', (data) => {
    currentPlayerName.textContent = data.nickname;
    
    if (data.playerId === socket.id) {
        descriptionInput.disabled = false;
        sendDescriptionBtn.disabled = false;
        descriptionInput.focus();
    } else {
        descriptionInput.disabled = true;
        sendDescriptionBtn.disabled = true;
    }
    
    startTimer(30, timerDisplay);
});

// 🔹 Actualizada: socket.on('playerDescription')
socket.on('playerDescription', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `
        <div class="nickname">🎤 ${data.nickname}:</div>
        <div class="description">${data.description}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    playSound('notification');
});

socket.on('votingPhase', (data) => {
    votingPlayers.innerHTML = '';
    
    data.players.forEach(player => {
        if (player.id === socket.id) return;
        
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.onclick = () => votePlayer(player.id, playerCard);
        
        playerCard.innerHTML = `
            <div class="player-avatar">${player.nickname.charAt(0).toUpperCase()}</div>
            <div class="player-nickname">${player.nickname}</div>
        `;
        
        votingPlayers.appendChild(playerCard);
    });
    
    showScreen('voting');
    startTimer(15, votingTimer);
});

socket.on('gameEnded', (data) => {
    if (data.guessedCorrectly) {
        resultTitle.textContent = '✅ ¡Atraparon al impostor!';
        resultTitle.style.color = '#4caf50';
    } else {
        resultTitle.textContent = '❌ El impostor ganó';
        resultTitle.style.color = '#ff6b6b';
    }
    
    impostorReveal.innerHTML = `
        <h3>El impostor era:</h3>
        ${data.impostors.map(imp => `<p>🎭 ${imp.nickname}</p>`).join('')}
        <p style="margin-top: 15px;">Más votado: ${data.mostVoted.nickname} (${data.mostVoted.votes} votos)</p>
    `;
    
    resultsTable.innerHTML = '';
    data.players.forEach(player => {
        const row = document.createElement('div');
        row.className = 'result-row' + (player.isImpostor ? ' impostor' : '');
        row.innerHTML = `
            <div class="result-info">
                <div class="player-avatar">${player.nickname.charAt(0).toUpperCase()}</div>
                <strong>${player.nickname}</strong>
                ${player.isImpostor ? '🎭' : ''}
            </div>
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">XP</span>
                    <span class="stat-value">+${player.xp}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Puntos</span>
                    <span class="stat-value">${player.score}</span>
                </div>
            </div>
        `;
        resultsTable.appendChild(row);
    });
    
    showScreen('results');
});

socket.on('error', (data) => {
    alert(data.message);
});

// 🔹 Actualizada: votePlayer
function votePlayer(playerId, cardElement) {
    socket.emit('vote', { votedPlayerId: playerId });
    
    document.querySelectorAll('.player-card').forEach(card => {
        card.classList.remove('voted');
        card.onclick = null;
    });
    cardElement.classList.add('voted');
    playSound('success');
    
    cardElement.innerHTML += '<div style="position:absolute;top:10px;right:10px;font-size:30px;">✓</div>';
}

function startTimer(seconds, displayElement) {
    let timeLeft = seconds;
    displayElement.textContent = timeLeft;
    
    const interval = setInterval(() => {
        timeLeft--;
        displayElement.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            displayElement.classList.add('pulse');
        }
        
        if (timeLeft <= 0) {
            clearInterval(interval);
            displayElement.classList.remove('pulse');
        }
    }, 1000);
}

function getCategoryName(category) {
    const names = {
        futbol: '⚽ Fútbol',
        comida: '🍔 Comida',
        paises: '🌍 Países',
        peliculas: '🎬 Películas',
        animales: '🦁 Animales',
        profesiones: '💼 Profesiones',
        marcas: '🏢 Marcas',
        videojuegos: '🎮 Videojuegos'
    };
    return names[category] || category;
}

nicknameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        createRoomBtn.click();
    }
});

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinGameBtn.click();
    }
});

descriptionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendDescriptionBtn.click();
    }
});

console.log('🎮 Juego cargado correctamente');

// Efecto de escritura para el título
const title = document.querySelector('.title');
if (title) {
    const text = title.textContent;
    title.textContent = '';
    let i = 0;
    const typeWriter = setInterval(() => {
        if (i < text.length) {
            title.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(typeWriter);
        }
    }, 100);
}

// Sonidos
function playSound(type) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'success') {
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'error') {
        oscillator.frequency.value = 200;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === 'notification') {
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
}

// Mejor alerta con sonido
const originalAlert = window.alert;
window.alert = function(message) {
    playSound('error');
    originalAlert(message);
};
