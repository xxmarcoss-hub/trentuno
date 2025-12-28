class GameUI {
    constructor() {
        // Screens
        this.lobbyScreen = document.getElementById('lobby-screen');
        this.waitingScreen = document.getElementById('waiting-screen');
        this.gameScreen = document.getElementById('game-screen');

        // Lobby elements
        this.playerNameInput = document.getElementById('player-name');
        this.roomCodeInput = document.getElementById('room-code-input');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        this.lobbyError = document.getElementById('lobby-error');

        // Waiting room elements
        this.roomCodeDisplay = document.getElementById('room-code-display');
        this.roomLinkInput = document.getElementById('room-link');
        this.copyLinkBtn = document.getElementById('copy-link-btn');
        this.playersList = document.getElementById('players-list');
        this.playerCount = document.getElementById('player-count');
        this.startGameBtn = document.getElementById('start-game-btn');

        // Game elements
        this.gameRoomCode = document.getElementById('game-room-code');
        this.gameCopyLink = document.getElementById('game-copy-link');
        this.toggleMuteBtn = document.getElementById('toggle-mute');
        this.toggleVideoBtn = document.getElementById('toggle-video');
        this.videosContainer = document.getElementById('videos-container');
        this.localVideo = document.getElementById('local-video');
        this.currentTurn = document.getElementById('current-turn');
        this.turnIndicator = document.querySelector('.turn-indicator');
        this.tableCards = document.getElementById('table-cards');
        this.deckCount = document.getElementById('deck-count');
        this.playerHand = document.getElementById('player-hand');
        this.playCardBtn = document.getElementById('play-card-btn');
        this.drawCardBtn = document.getElementById('draw-card-btn');
        this.passBtn = document.getElementById('pass-btn');

        this.selectedCardIndex = null;
        this.players = {};
    }

    showScreen(screen) {
        this.lobbyScreen.classList.add('hidden');
        this.waitingScreen.classList.add('hidden');
        this.gameScreen.classList.add('hidden');
        screen.classList.remove('hidden');
    }

    showLobby() {
        this.showScreen(this.lobbyScreen);
    }

    showWaitingRoom(roomCode, players) {
        this.showScreen(this.waitingScreen);
        this.roomCodeDisplay.textContent = roomCode;
        this.roomLinkInput.value = `${window.location.origin}?room=${roomCode}`;
        this.updatePlayersList(players);
    }

    showGame(roomCode) {
        this.showScreen(this.gameScreen);
        this.gameRoomCode.textContent = roomCode;
    }

    showError(message) {
        this.lobbyError.textContent = message;
        setTimeout(() => {
            this.lobbyError.textContent = '';
        }, 3000);
    }

    updatePlayersList(players) {
        this.playersList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            li.dataset.id = player.id;
            this.playersList.appendChild(li);
            this.players[player.id] = player;
        });
        this.playerCount.textContent = players.length;
        this.startGameBtn.disabled = players.length < 2;
    }

    setLocalStream(stream) {
        this.localVideo.srcObject = stream;
    }

    addRemoteVideo(peerId, stream, playerName) {
        // Check if video already exists
        if (document.getElementById(`video-${peerId}`)) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'video-wrapper';
        wrapper.id = `video-${peerId}`;

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsinline = true;
        video.srcObject = stream;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'player-name';
        nameSpan.textContent = playerName || 'Giocatore';

        wrapper.appendChild(video);
        wrapper.appendChild(nameSpan);
        this.videosContainer.appendChild(wrapper);
    }

    removeRemoteVideo(peerId) {
        const wrapper = document.getElementById(`video-${peerId}`);
        if (wrapper) {
            wrapper.remove();
        }
    }

    updateGameState(state, myId) {
        // Update turn indicator
        const currentPlayer = state.players[state.currentPlayer];
        const isMyTurn = state.currentPlayer === myId;

        if (isMyTurn) {
            this.currentTurn.textContent = 'È il tuo turno!';
            this.turnIndicator.classList.add('your-turn');
        } else {
            this.currentTurn.textContent = `Turno di ${currentPlayer?.name || 'altro giocatore'}`;
            this.turnIndicator.classList.remove('your-turn');
        }

        // Update table
        CardRenderer.renderTable(this.tableCards, state.table);

        // Update deck count
        this.deckCount.textContent = state.deckCount;

        // Update player hand
        const myPlayer = state.players[myId];
        if (myPlayer) {
            CardRenderer.renderHand(this.playerHand, myPlayer.hand, (index) => {
                this.selectedCardIndex = index;
                this.playCardBtn.disabled = !isMyTurn;
            });
        }

        // Update controls
        this.playCardBtn.disabled = !isMyTurn || this.selectedCardIndex === null;
        this.drawCardBtn.disabled = !isMyTurn || state.deckCount === 0;
        this.passBtn.disabled = !isMyTurn;
    }

    getSelectedCardIndex() {
        return this.selectedCardIndex;
    }

    clearSelection() {
        this.selectedCardIndex = null;
        this.playerHand.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        this.playCardBtn.disabled = true;
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Could show a toast notification here
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    setMuted(muted) {
        this.toggleMuteBtn.classList.toggle('muted', muted);
    }

    setVideoOff(off) {
        this.toggleVideoBtn.classList.toggle('video-off', off);
    }
}

window.GameUI = GameUI;
