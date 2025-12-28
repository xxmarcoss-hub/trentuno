document.addEventListener('DOMContentLoaded', () => {
    const ui = new GameUI();
    const socket = new SocketManager();
    const webrtc = new WebRTCManager(socket);

    let currentRoomCode = null;
    let players = {};

    // Check URL for room code
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        ui.roomCodeInput.value = roomFromUrl.toUpperCase();
    }

    // WebRTC callbacks
    webrtc.onRemoteStream = (peerId, stream) => {
        const player = players[peerId];
        ui.addRemoteVideo(peerId, stream, player?.name);
    };

    webrtc.onRemoteStreamRemoved = (peerId) => {
        ui.removeRemoteVideo(peerId);
    };

    // Lobby handlers
    ui.createRoomBtn.addEventListener('click', async () => {
        const name = ui.playerNameInput.value.trim();
        if (!name) {
            ui.showError('Inserisci il tuo nome');
            return;
        }

        const result = await socket.createRoom(name);
        if (result.success) {
            currentRoomCode = result.roomCode;
            players = {};
            result.players.forEach(p => players[p.id] = p);
            ui.showWaitingRoom(result.roomCode, result.players);
            await initMedia();
        } else {
            ui.showError(result.error || 'Errore nella creazione della stanza');
        }
    });

    ui.joinRoomBtn.addEventListener('click', async () => {
        const name = ui.playerNameInput.value.trim();
        const code = ui.roomCodeInput.value.trim().toUpperCase();

        if (!name) {
            ui.showError('Inserisci il tuo nome');
            return;
        }
        if (!code) {
            ui.showError('Inserisci il codice stanza');
            return;
        }

        const result = await socket.joinRoom(code, name);
        if (result.success) {
            currentRoomCode = result.roomCode;
            players = {};
            result.players.forEach(p => players[p.id] = p);
            ui.showWaitingRoom(result.roomCode, result.players);
            await initMedia();

            // Connect to existing players
            for (const player of result.players) {
                if (player.id !== socket.id) {
                    await webrtc.connectToPeer(player.id);
                }
            }
        } else {
            ui.showError(result.error || 'Errore nell\'accesso alla stanza');
        }
    });

    async function initMedia() {
        const stream = await webrtc.initLocalStream();
        if (stream) {
            ui.setLocalStream(stream);
        }
    }

    // Waiting room handlers
    ui.copyLinkBtn.addEventListener('click', () => {
        ui.copyToClipboard(ui.roomLinkInput.value);
    });

    ui.startGameBtn.addEventListener('click', () => {
        socket.startGame();
    });

    // Socket events
    socket.on('player-joined', async (data) => {
        players[data.id] = { id: data.id, name: data.name };
        ui.updatePlayersList(data.players);
        data.players.forEach(p => players[p.id] = p);
    });

    socket.on('player-left', (data) => {
        delete players[data.id];
        ui.updatePlayersList(data.players);
        ui.removeRemoteVideo(data.id);
    });

    socket.on('game-started', (state) => {
        ui.showGame(currentRoomCode);
        ui.updateGameState(state, socket.id);
    });

    socket.on('game-update', (state) => {
        ui.updateGameState(state, socket.id);
    });

    // Game controls
    ui.playCardBtn.addEventListener('click', () => {
        const index = ui.getSelectedCardIndex();
        if (index !== null) {
            socket.playCard(index);
            ui.clearSelection();
        }
    });

    ui.drawCardBtn.addEventListener('click', () => {
        socket.drawCard();
    });

    ui.passBtn.addEventListener('click', () => {
        socket.passTurn();
    });

    // Media controls
    ui.toggleMuteBtn.addEventListener('click', () => {
        const muted = webrtc.toggleMute();
        ui.setMuted(muted);
    });

    ui.toggleVideoBtn.addEventListener('click', () => {
        const off = webrtc.toggleVideo();
        ui.setVideoOff(off);
    });

    // Game screen copy link
    ui.gameCopyLink.addEventListener('click', () => {
        ui.copyToClipboard(`${window.location.origin}?room=${currentRoomCode}`);
    });
});
