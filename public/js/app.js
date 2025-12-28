document.addEventListener('DOMContentLoaded', () => {
    const ui = new GameUI();
    const socket = new SocketManager();
    const webrtc = new WebRTCManager(socket);

    let currentRoomCode = null;
    let players = {};
    let lastRoundResult = null;

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
        console.log('game-started received:', state);
        console.log('roundActive:', state.roundActive);
        ui.showGame(currentRoomCode);
        ui.updateGameState(state, socket.id);
    });

    socket.on('game-update', (state) => {
        ui.updateGameState(state, socket.id);
    });

    socket.on('round-started', (state) => {
        ui.hideRoundResult();
        ui.updateGameState(state, socket.id);
    });

    socket.on('player-action', (data) => {
        ui.showActionAnimation(data.action, data.playerName);
    });

    socket.on('round-end', (result) => {
        lastRoundResult = result;
        // Delay showing result to let action animation play
        setTimeout(() => {
            ui.showRoundResult(result);
        }, 1600);
    });

    // Trentuno game controls (Drag and Drop)

    // Called when player drags a card from deck or discard pile to hand
    ui.onDrawCard = (source) => {
        socket.drawCard(source); // 'deck' or 'discard'
    };

    // Called when player drags a card from hand to discard pile
    ui.onDiscardCard = (cardIndex) => {
        socket.discardCard(cardIndex);
    };

    // Knock
    ui.knockBtn.addEventListener('click', () => {
        socket.knock();
    });

    // Declare 31
    ui.declare31Btn.addEventListener('click', () => {
        socket.declare31();
    });

    // Next round button
    ui.nextRoundBtn.addEventListener('click', () => {
        if (lastRoundResult && lastRoundResult.gameOver) {
            ui.showGameOver(lastRoundResult.finalWinners);
        } else {
            socket.nextRound();
        }
    });

    // Back to lobby
    ui.backToLobbyBtn.addEventListener('click', () => {
        ui.hideGameOver();
        ui.showLobby();
        window.location.reload();
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
