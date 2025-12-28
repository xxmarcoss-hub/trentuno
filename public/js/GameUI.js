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

        // Trentuno game elements
        this.potDisplay = document.getElementById('pot-display');
        this.roundDisplay = document.getElementById('round-display');
        this.currentTurn = document.getElementById('current-turn');
        this.turnIndicator = document.querySelector('.turn-indicator');
        this.knockIndicator = document.getElementById('knock-indicator');
        this.playersInfo = document.getElementById('players-info');
        this.deckCount = document.getElementById('deck-count');
        this.discardPile = document.getElementById('discard-pile');
        this.playerHand = document.getElementById('player-hand');
        this.myScore = document.getElementById('my-score');
        this.myCoins = document.getElementById('my-coins');

        // Game controls
        this.drawDiscardBtn = document.getElementById('draw-discard-btn');
        this.drawDeckBtn = document.getElementById('draw-deck-btn');
        this.knockBtn = document.getElementById('knock-btn');
        this.declare31Btn = document.getElementById('declare-31-btn');

        // Modals
        this.roundResultModal = document.getElementById('round-result-modal');
        this.resultTitle = document.getElementById('result-title');
        this.resultMessage = document.getElementById('result-message');
        this.handsGrid = document.getElementById('hands-grid');
        this.potRemaining = document.getElementById('pot-remaining');
        this.nextRoundBtn = document.getElementById('next-round-btn');

        this.gameOverModal = document.getElementById('game-over-modal');
        this.finalResults = document.getElementById('final-results');
        this.backToLobbyBtn = document.getElementById('back-to-lobby-btn');

        // Action overlay
        this.actionOverlay = document.getElementById('action-overlay');
        this.actionText = document.getElementById('action-text');

        this.selectedCardIndex = null;
        this.players = {};
        this.currentState = null;
        this.myId = null;
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
        this.currentState = state;
        this.myId = myId;

        // Update game info
        this.potDisplay.textContent = state.pot;
        this.roundDisplay.textContent = state.roundNumber || 1;

        // Update turn indicator
        const currentPlayer = state.players[state.currentPlayer];
        const isMyTurn = state.currentPlayer === myId && state.roundActive;

        if (!state.roundActive) {
            this.currentTurn.textContent = 'In attesa della prossima mano...';
            this.turnIndicator.classList.remove('your-turn');
        } else if (isMyTurn) {
            this.currentTurn.textContent = 'È il tuo turno!';
            this.turnIndicator.classList.add('your-turn');
        } else {
            this.currentTurn.textContent = `Turno di ${currentPlayer?.name || 'altro giocatore'}`;
            this.turnIndicator.classList.remove('your-turn');
        }

        // Update knock indicator
        if (state.knocker) {
            this.knockIndicator.classList.remove('hidden');
            this.knockIndicator.textContent = `${state.knockerName} ha bussato!`;
        } else {
            this.knockIndicator.classList.add('hidden');
        }

        // Update players info bar
        this.updatePlayersInfo(state, myId);

        // Update deck count
        this.deckCount.textContent = state.deckCount;

        // Update discard pile
        this.renderDiscardPile(state.topDiscard);

        // Update player hand
        const myPlayer = state.players[myId];
        if (myPlayer) {
            this.myScore.textContent = myPlayer.score;
            this.myCoins.textContent = myPlayer.coins;

            CardRenderer.renderHand(this.playerHand, myPlayer.hand, (index) => {
                this.handleCardClick(index, isMyTurn);
            });
        }

        // Update controls
        this.updateControls(state, myId, isMyTurn);
    }

    updatePlayersInfo(state, myId) {
        this.playersInfo.innerHTML = '';

        state.playerOrder.forEach(playerId => {
            const player = state.players[playerId];
            if (!player) return;

            const card = document.createElement('div');
            card.className = 'player-info-card';

            if (playerId === state.currentPlayer && state.roundActive) {
                card.classList.add('current-turn');
            }
            if (playerId === state.knocker) {
                card.classList.add('knocked');
            }
            if (playerId === myId) {
                card.classList.add('is-me');
            }

            card.innerHTML = `
                <div class="player-info-name">${player.name}${playerId === myId ? ' (Tu)' : ''}</div>
                <div class="player-info-coins">${player.coins} monete</div>
            `;

            this.playersInfo.appendChild(card);
        });
    }

    renderDiscardPile(topCard) {
        this.discardPile.innerHTML = '';
        if (topCard) {
            const cardEl = CardRenderer.createCard(topCard);
            cardEl.classList.add('animating');
            this.discardPile.appendChild(cardEl);
        }
    }

    handleCardClick(index, isMyTurn) {
        // Deselect previous
        this.playerHand.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));

        // Select new
        this.selectedCardIndex = index;
        const cards = this.playerHand.querySelectorAll('.card');
        if (cards[index]) {
            cards[index].classList.add('selected');
        }

        // Update controls based on selection
        if (isMyTurn && this.currentState?.roundActive) {
            this.drawDiscardBtn.disabled = !this.currentState.topDiscard;
            this.drawDeckBtn.disabled = this.currentState.deckCount === 0;
        }
    }

    updateControls(state, myId, isMyTurn) {
        const hasKnocked = state.knocker !== null;
        const myPlayer = state.players[myId];
        const canDeclare31 = myPlayer?.score === 31;

        // Disable all by default
        this.drawDiscardBtn.disabled = true;
        this.drawDeckBtn.disabled = true;
        this.knockBtn.disabled = true;
        this.declare31Btn.disabled = true;

        if (!isMyTurn || !state.roundActive) return;

        // Enable based on state
        if (this.selectedCardIndex !== null) {
            this.drawDiscardBtn.disabled = !state.topDiscard;
            this.drawDeckBtn.disabled = state.deckCount === 0;
        }

        this.knockBtn.disabled = hasKnocked;
        this.declare31Btn.disabled = !canDeclare31;
    }

    getSelectedCardIndex() {
        return this.selectedCardIndex;
    }

    clearSelection() {
        this.selectedCardIndex = null;
        this.playerHand.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        this.drawDiscardBtn.disabled = true;
        this.drawDeckBtn.disabled = true;
    }

    showActionAnimation(action, playerName) {
        let text = '';
        let className = '';

        switch (action) {
            case 'draw-from-discard':
                text = `${playerName} pesca dal pozzo`;
                break;
            case 'draw-from-deck':
                text = `${playerName} pesca dal mazzo`;
                break;
            case 'knock':
                text = `${playerName} BUSSA!`;
                className = 'knock';
                break;
            case 'declare-31':
                text = `${playerName} TRENTUNO!`;
                className = 'declare-31';
                break;
            default:
                return;
        }

        this.actionText.textContent = text;
        this.actionText.className = 'action-text ' + className;
        this.actionOverlay.classList.remove('hidden');

        setTimeout(() => {
            this.actionOverlay.classList.add('hidden');
        }, 1500);
    }

    showRoundResult(result) {
        const winnersNames = result.winners.map(id => result.players[id].name).join(', ');

        // Set title
        if (result.reason === '31-declared') {
            this.resultTitle.textContent = 'TRENTUNO!';
            this.resultMessage.textContent = `${winnersNames} ha dichiarato 31 e vince 2 monete!`;
        } else {
            this.resultTitle.textContent = 'Fine Mano';
            const winnerScore = result.players[result.winners[0]].score;
            if (result.winners.length === 1) {
                this.resultMessage.textContent = `${winnersNames} vince con ${winnerScore} punti! (+1 moneta)`;
            } else {
                this.resultMessage.textContent = `Pareggio a ${winnerScore} punti! ${winnersNames} vincono 1 moneta ciascuno`;
            }
        }

        // Render all hands
        this.handsGrid.innerHTML = '';
        Object.entries(result.players).forEach(([id, player]) => {
            const isWinner = result.winners.includes(id);
            const div = document.createElement('div');
            div.className = 'player-result' + (isWinner ? ' winner' : '');

            div.innerHTML = `
                <h4>${player.name}${isWinner ? ' - VINCE!' : ''}</h4>
                <div class="score">${player.score} punti - ${player.coins} monete</div>
                <div class="result-hand"></div>
            `;

            const handContainer = div.querySelector('.result-hand');
            player.hand.forEach(card => {
                const cardEl = CardRenderer.createCard(card);
                handContainer.appendChild(cardEl);
            });

            this.handsGrid.appendChild(div);
        });

        // Update pot remaining
        this.potRemaining.querySelector('span').textContent = result.potRemaining;

        // Check if game over
        if (result.gameOver) {
            this.nextRoundBtn.textContent = 'Vedi Risultati';
        } else {
            this.nextRoundBtn.textContent = 'Prossima Mano';
        }

        this.roundResultModal.classList.remove('hidden');
    }

    hideRoundResult() {
        this.roundResultModal.classList.add('hidden');
    }

    showGameOver(finalWinners) {
        this.hideRoundResult();

        this.finalResults.innerHTML = '';

        if (finalWinners.length === 1) {
            this.finalResults.innerHTML = `
                <div class="final-winner">
                    <span class="winner-name">${finalWinners[0].name}</span> vince la partita!
                    <div class="winner-coins">${finalWinners[0].coins} monete</div>
                </div>
            `;
        } else {
            const names = finalWinners.map(w => w.name).join(', ');
            this.finalResults.innerHTML = `
                <div class="final-winner">
                    <span class="winner-name">Pareggio!</span>
                    <div class="winner-coins">${names} vincono con ${finalWinners[0].coins} monete</div>
                </div>
            `;
        }

        this.gameOverModal.classList.remove('hidden');
    }

    hideGameOver() {
        this.gameOverModal.classList.add('hidden');
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
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
