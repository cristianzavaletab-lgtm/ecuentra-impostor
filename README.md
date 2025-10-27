# 🎭 Encuentra al Impostor

Juego multijugador online en tiempo real donde los jugadores deben descubrir quién es el impostor.

## 🚀 Características

- ✅ Multijugador en tiempo real (4-8 jugadores)
- ✅ 8 categorías temáticas diferentes
- ✅ Comunicación por texto
- ✅ Sistema de votación
- ✅ Sistema de puntos y XP
- ✅ Interfaz responsive

## 📋 Requisitos

- Node.js v14 o superior
- NPM v6 o superior

## 🛠️ Instalación

Las dependencias ya están instaladas. Para verificar:
```bash
npm list
```

## ▶️ Ejecución

Para iniciar el servidor en modo desarrollo:
```bash
npm run dev
```

Para iniciar en modo producción:
```bash
npm start
```

El juego estará disponible en: http://localhost:3000

## 🎮 Cómo Jugar

1. Ingresa tu nickname
2. Crea una sala o únete con un código
3. El host selecciona la categoría e inicia
4. Cada jugador describe su rol (excepto el impostor que tiene ???)
5. Todos votan quién creen que es el impostor
6. ¡Gana puntos si aciertas!

## 📁 Estructura del Proyecto
```
encuentra-impostor/
├── client/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── game.js
│   ├── assets/
│   └── index.html
├── server.js
├── package.json
└── README.md
```

## 🔧 Tecnologías

- Node.js
- Express
- Socket.io
- HTML5/CSS3
- JavaScript

## 👤 Autor

Cristian Zavaleta

## 📝 Licencia

ISC