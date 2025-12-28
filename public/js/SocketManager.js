class SocketManager {
    constructor() {
        this.socket = io();
        this.callbacks = {};
    }

    on(event, callback) {
        this.socket.on(event, callback);
    }

    emit(event, data, callback) {
        if (callback) {
            this.socket.emit(event, data, callback);
        } else {
            this.socket.emit(event, data);
        }
    }

    createRoom(playerName) {
        return new Promise((resolve) => {
            this.socket.emit('create-room', playerName, resolve);
        });
    }

    joinRoom(roomCode, playerName) {
        return new Promise((resolve) => {
            this.socket.emit('join-room', { roomCode, playerName }, resolve);
        });
    }

    startGame() {
        this.socket.emit('start-game');
    }

    playCard(cardIndex) {
        this.socket.emit('play-card', cardIndex);
    }

    drawCard() {
        this.socket.emit('draw-card');
    }

    passTurn() {
        this.socket.emit('pass-turn');
    }

    // WebRTC signaling
    sendOffer(target, offer) {
        this.socket.emit('webrtc-offer', { target, offer });
    }

    sendAnswer(target, answer) {
        this.socket.emit('webrtc-answer', { target, answer });
    }

    sendIceCandidate(target, candidate) {
        this.socket.emit('webrtc-ice-candidate', { target, candidate });
    }

    get id() {
        return this.socket.id;
    }
}

window.SocketManager = SocketManager;
