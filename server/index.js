const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Room = require('./Room');

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Store active rooms
const rooms = new Map();

// Generate unique room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new room
    socket.on('create-room', (playerName, callback) => {
        let code;
        do {
            code = generateRoomCode();
        } while (rooms.has(code));

        const room = new Room(code);
        room.addPlayer(socket.id, playerName);
        rooms.set(code, room);

        socket.join(code);
        socket.roomCode = code;
        socket.playerName = playerName;

        callback({ success: true, roomCode: code, players: room.getPlayersInfo() });
        console.log(`Room ${code} created by ${playerName}`);
    });

    // Join existing room
    socket.on('join-room', (data, callback) => {
        const { roomCode, playerName } = data;
        const room = rooms.get(roomCode.toUpperCase());

        if (!room) {
            callback({ success: false, error: 'Stanza non trovata' });
            return;
        }

        if (room.players.size >= 5) {
            callback({ success: false, error: 'Stanza piena (max 5 giocatori)' });
            return;
        }

        if (room.gameStarted) {
            callback({ success: false, error: 'Partita già iniziata' });
            return;
        }

        room.addPlayer(socket.id, playerName);
        socket.join(roomCode.toUpperCase());
        socket.roomCode = roomCode.toUpperCase();
        socket.playerName = playerName;

        const players = room.getPlayersInfo();
        callback({ success: true, roomCode: roomCode.toUpperCase(), players });

        // Notify others
        socket.to(roomCode.toUpperCase()).emit('player-joined', {
            id: socket.id,
            name: playerName,
            players
        });

        console.log(`${playerName} joined room ${roomCode}`);
    });

    // WebRTC signaling
    socket.on('webrtc-offer', (data) => {
        socket.to(data.target).emit('webrtc-offer', {
            offer: data.offer,
            from: socket.id
        });
    });

    socket.on('webrtc-answer', (data) => {
        socket.to(data.target).emit('webrtc-answer', {
            answer: data.answer,
            from: socket.id
        });
    });

    socket.on('webrtc-ice-candidate', (data) => {
        socket.to(data.target).emit('webrtc-ice-candidate', {
            candidate: data.candidate,
            from: socket.id
        });
    });

    // Start game
    socket.on('start-game', () => {
        const room = rooms.get(socket.roomCode);
        if (room && room.players.size >= 2) {
            room.startGame();
            io.to(socket.roomCode).emit('game-started', room.getGameState());
        }
    });

    // Play card
    socket.on('play-card', (cardIndex) => {
        const room = rooms.get(socket.roomCode);
        if (room) {
            const result = room.playCard(socket.id, cardIndex);
            if (result.success) {
                io.to(socket.roomCode).emit('game-update', room.getGameState());
            }
        }
    });

    // Draw card
    socket.on('draw-card', () => {
        const room = rooms.get(socket.roomCode);
        if (room) {
            const result = room.drawCard(socket.id);
            if (result.success) {
                io.to(socket.roomCode).emit('game-update', room.getGameState());
            }
        }
    });

    // Pass turn
    socket.on('pass-turn', () => {
        const room = rooms.get(socket.roomCode);
        if (room) {
            room.passTurn(socket.id);
            io.to(socket.roomCode).emit('game-update', room.getGameState());
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                room.removePlayer(socket.id);

                if (room.players.size === 0) {
                    rooms.delete(socket.roomCode);
                    console.log(`Room ${socket.roomCode} deleted (empty)`);
                } else {
                    io.to(socket.roomCode).emit('player-left', {
                        id: socket.id,
                        name: socket.playerName,
                        players: room.getPlayersInfo()
                    });
                }
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
