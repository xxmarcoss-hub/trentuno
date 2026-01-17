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

        // Player positions around the table
        this.playersTop = document.getElementById('players-top');
        this.playersLeft = document.getElementById('players-left');
        this.playersRight = document.getElementById('players-right');
        this.playersBottom = document.getElementById('players-bottom');
        this.remoteVideos = new Map(); // peerId -> { wrapper, position }

        // Trentuno game elements
        this.potDisplay = document.getElementById('pot-display');
        this.potCoins = document.getElementById('pot-coins');
        this.roundDisplay = document.getElementById('round-display');
        this.knockIndicator = document.getElementById('knock-indicator');
        this.deckElement = document.getElementById('deck');
        this.discardPile = document.getElementById('discard-pile');
        this.playerHand = document.getElementById('player-hand');

        // Game controls
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

        // Drag and drop callbacks
        this.onDrawCard = null;    // Called when card is drawn from deck/discard
        this.onDiscardCard = null; // Called when card is discarded

        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        // Make deck draggable
        this.deckElement.setAttribute('draggable', 'true');
        this.deckElement.addEventListener('dragstart', (e) => {
            if (!this.canDraw()) return e.preventDefault();
            e.dataTransfer.setData('text/plain', 'deck');
            e.dataTransfer.effectAllowed = 'move';
            this.deckElement.classList.add('dragging');
        });
        this.deckElement.addEventListener('dragend', () => {
            this.deckElement.classList.remove('dragging');
        });

        // Player hand as drop zone for drawing cards
        this.playerHand.addEventListener('dragover', (e) => {
            if (!this.canDraw()) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.playerHand.classList.add('drop-target');
        });
        this.playerHand.addEventListener('dragleave', () => {
            this.playerHand.classList.remove('drop-target');
        });
        this.playerHand.addEventListener('drop', (e) => {
            e.preventDefault();
            this.playerHand.classList.remove('drop-target');
            const source = e.dataTransfer.getData('text/plain');
            if (source === 'deck' || source === 'discard') {
                if (this.onDrawCard) this.onDrawCard(source);
            }
        });

        // Discard pile as drop zone for discarding cards
        this.discardPile.addEventListener('dragover', (e) => {
            if (!this.canDiscard()) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.discardPile.classList.add('drop-target');
        });
        this.discardPile.addEventListener('dragleave', () => {
            this.discardPile.classList.remove('drop-target');
        });
        this.discardPile.addEventListener('drop', (e) => {
            e.preventDefault();
            this.discardPile.classList.remove('drop-target');
            const data = e.dataTransfer.getData('text/plain');
            if (data.startsWith('hand-')) {
                const cardIndex = parseInt(data.replace('hand-', ''));
                if (this.onDiscardCard) this.onDiscardCard(cardIndex);
            }
        });
    }

    // Creates a visual pile of coins
    createCoinsPile(count, maxVisible = 10) {
        const fragment = document.createDocumentFragment();
        const visibleCoins = Math.min(count, maxVisible);

        for (let i = 0; i < visibleCoins; i++) {
            const coin = document.createElement('div');
            coin.className = 'coin';
            fragment.appendChild(coin);
        }

        // If there are more coins than visible, show count
        if (count > maxVisible) {
            const countSpan = document.createElement('span');
            countSpan.className = 'coins-count';
            countSpan.textContent = `+${count - maxVisible}`;
            fragment.appendChild(countSpan);
        }

        return fragment;
    }

    // Renders the central pot (gruzzolo)
    renderPotCoins(potAmount) {
        if (!this.potCoins) return;

        this.potCoins.innerHTML = '';
        if (potAmount > 0) {
            const coins = this.createCoinsPile(potAmount, 10);
            this.potCoins.appendChild(coins);
        }

        if (this.potCount) {
            this.potCount.textContent = potAmount;
        }
    }

    canDraw() {
        if (!this.currentState || !this.myId) return false;
        const isMyTurn = this.currentState.currentPlayer === this.myId;
        const roundActive = this.currentState.roundActive;
        const myPlayer = this.currentState.players[this.myId];
        const hasDrawn = myPlayer?.hasDrawn || false;
        return isMyTurn && roundActive && !hasDrawn;
    }

    canDiscard() {
        if (!this.currentState || !this.myId) return false;
        const isMyTurn = this.currentState.currentPlayer === this.myId;
        const roundActive = this.currentState.roundActive;
        const myPlayer = this.currentState.players[this.myId];
        const hasDrawn = myPlayer?.hasDrawn || false;
        return isMyTurn && roundActive && hasDrawn;
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
        wrapper.dataset.peerId = peerId;

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsinline = true;
        video.srcObject = stream;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'player-name';
        nameSpan.textContent = playerName || 'Giocatore';

        wrapper.appendChild(video);
        wrapper.appendChild(nameSpan);

        // Coins pile will be added by updateVideoWrapperCoins when game state updates

        // Determine position based on number of remote players
        const position = this.getNextPosition();
        this.remoteVideos.set(peerId, { wrapper, position, playerName });
        this.positionVideo(wrapper, position);
    }

    getNextPosition() {
        // Positions: left, right only (webcams on sides of table)
        const positions = ['left', 'right'];
        const counts = { left: 0, right: 0 };

        this.remoteVideos.forEach(({ position }) => {
            if (counts[position] !== undefined) {
                counts[position]++;
            }
        });

        // Find position with least players
        let minPos = 'left';
        let minCount = counts.left;
        for (const pos of positions) {
            if (counts[pos] < minCount) {
                minCount = counts[pos];
                minPos = pos;
            }
        }
        return minPos;
    }

    positionVideo(wrapper, position) {
        const container = {
            'left': this.playersLeft,
            'right': this.playersRight
        }[position];

        if (container) {
            container.appendChild(wrapper);
        }
    }

    repositionAllVideos() {
        // Clear position containers (only left and right now)
        this.playersLeft.innerHTML = '';
        this.playersRight.innerHTML = '';

        const entries = Array.from(this.remoteVideos.entries());

        // Distribute players alternating between left and right
        entries.forEach(([peerId, data], index) => {
            // Alternate: even index = left, odd index = right
            const position = index % 2 === 0 ? 'left' : 'right';
            data.position = position;
            this.positionVideo(data.wrapper, position);
        });
    }

    removeRemoteVideo(peerId) {
        const wrapper = document.getElementById(`video-${peerId}`);
        if (wrapper) {
            wrapper.remove();
        }
        this.remoteVideos.delete(peerId);
        this.repositionAllVideos();
    }

    updateVideoStates(state, myId) {
        // Update local player video
        const localWrapper = this.playersBottom.querySelector('.video-wrapper.local');
        if (localWrapper && state.players[myId]) {
            const isMyTurn = state.currentPlayer === myId && state.roundActive;
            localWrapper.classList.toggle('current-turn', isMyTurn);
            localWrapper.classList.toggle('knocked', state.knocker === myId);

            // Update local player name
            const nameSpan = localWrapper.querySelector('.player-name');
            if (nameSpan) {
                nameSpan.textContent = 'Tu';
            }

            // Update local player coins pile
            this.updateVideoWrapperCoins(localWrapper, state.players[myId].coins);
        }

        // Update remote player videos
        this.remoteVideos.forEach(({ wrapper }, peerId) => {
            const player = state.players[peerId];
            if (!player) return;

            const isCurrentTurn = state.currentPlayer === peerId && state.roundActive;
            const isKnocker = state.knocker === peerId;

            wrapper.classList.toggle('current-turn', isCurrentTurn);
            wrapper.classList.toggle('knocked', isKnocker);

            // Update name
            const nameSpan = wrapper.querySelector('.player-name');
            if (nameSpan) {
                nameSpan.textContent = player.name;
            }

            // Update coins pile
            this.updateVideoWrapperCoins(wrapper, player.coins);
        });
    }

    // Helper to update coins pile in video wrapper
    updateVideoWrapperCoins(wrapper, coinCount) {
        // Remove old coins display
        const oldCoinsSpan = wrapper.querySelector('.player-coins');
        if (oldCoinsSpan) {
            oldCoinsSpan.remove();
        }

        const oldCoinsPile = wrapper.querySelector('.player-coins-pile');
        if (oldCoinsPile) {
            oldCoinsPile.remove();
        }

        // Create new coins pile
        const coinsPileDiv = document.createElement('div');
        coinsPileDiv.className = 'player-coins-pile';

        if (coinCount > 0) {
            // Show up to 3 visual coins + count for more
            const visibleCoins = Math.min(coinCount, 3);
            for (let i = 0; i < visibleCoins; i++) {
                const coin = document.createElement('div');
                coin.className = 'coin';
                coinsPileDiv.appendChild(coin);
            }

            // Show count for additional coins
            const countSpan = document.createElement('span');
            countSpan.className = 'coins-count';
            countSpan.textContent = coinCount;
            coinsPileDiv.appendChild(countSpan);
        } else {
            // Show "0" if no coins
            const countSpan = document.createElement('span');
            countSpan.className = 'coins-count';
            countSpan.textContent = '0';
            coinsPileDiv.appendChild(countSpan);
        }

        wrapper.appendChild(coinsPileDiv);
    }

    updateGameState(state, myId) {
        this.currentState = state;
        this.myId = myId;

        // Update game info
        this.potDisplay.textContent = state.pot;
        this.roundDisplay.textContent = state.roundNumber || 1;

        // Render visual coins for central pot
        this.renderPotCoins(state.pot);

        // Update video wrappers with game state
        this.updateVideoStates(state, myId);

        const isMyTurn = state.currentPlayer === myId && state.roundActive;
        const myPlayer = state.players[myId];
        const hasDrawn = myPlayer?.hasDrawn || false;

        // Update knock indicator
        if (state.knocker) {
            this.knockIndicator.classList.remove('hidden');
            this.knockIndicator.textContent = `${state.knockerName} ha bussato!`;
        } else {
            this.knockIndicator.classList.add('hidden');
        }

        // Update deck - make it draggable only when it's player's turn and hasn't drawn
        if (isMyTurn && !hasDrawn && state.deckCount > 0) {
            this.deckElement.classList.add('can-drag');
        } else {
            this.deckElement.classList.remove('can-drag');
        }

        // Update discard pile
        this.renderDiscardPile(state.topDiscard, isMyTurn && !hasDrawn);

        // Update player hand
        if (myPlayer) {
            this.renderHand(myPlayer.hand, isMyTurn && hasDrawn);
        }

        // Update action controls
        this.updateControls(state, myId, isMyTurn);
    }

    renderDiscardPile(topCard, canDrag) {
        this.discardPile.innerHTML = '';
        if (topCard) {
            const cardEl = CardRenderer.createCard(topCard);
            cardEl.classList.add('animating');

            if (canDrag) {
                cardEl.setAttribute('draggable', 'true');
                cardEl.classList.add('can-drag');
                cardEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', 'discard');
                    e.dataTransfer.effectAllowed = 'move';
                    cardEl.classList.add('dragging');
                });
                cardEl.addEventListener('dragend', () => {
                    cardEl.classList.remove('dragging');
                });
            }

            this.discardPile.appendChild(cardEl);
        }
    }

    renderHand(cards, canDiscard) {
        this.playerHand.innerHTML = '';

        cards.forEach((card, index) => {
            const cardEl = CardRenderer.createCard(card);
            cardEl.dataset.index = index;

            if (canDiscard) {
                cardEl.setAttribute('draggable', 'true');
                cardEl.classList.add('can-drag');
                cardEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', `hand-${index}`);
                    e.dataTransfer.effectAllowed = 'move';
                    cardEl.classList.add('dragging');
                });
                cardEl.addEventListener('dragend', () => {
                    cardEl.classList.remove('dragging');
                });
            }

            this.playerHand.appendChild(cardEl);
        });
    }

    updateControls(state, myId, isMyTurn) {
        const hasKnocked = state.knocker !== null;
        const myPlayer = state.players[myId];
        const canDeclare31 = myPlayer?.score === 31;
        const hasDrawn = myPlayer?.hasDrawn || false;

        // Knock and declare31 only available when it's your turn and you haven't drawn yet
        this.knockBtn.disabled = !isMyTurn || !state.roundActive || hasKnocked || hasDrawn;
        this.declare31Btn.disabled = !isMyTurn || !state.roundActive || !canDeclare31 || hasDrawn;
    }

    getSelectedCardIndex() {
        return this.selectedCardIndex;
    }

    clearSelection() {
        this.selectedCardIndex = null;
        this.playerHand.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
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
            case 'discard':
                text = `${playerName} scarta`;
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
