const Deck = require('./Deck');

class Room {
    constructor(code) {
        this.code = code;
        this.players = new Map(); // socketId -> { name, hand, ... }
        this.deck = null;
        this.table = []; // Cards on table
        this.currentPlayerIndex = 0;
        this.gameStarted = false;
        this.playerOrder = []; // Array of socket IDs in play order
    }

    addPlayer(socketId, name) {
        this.players.set(socketId, {
            name,
            hand: [],
            score: 0
        });
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
        const index = this.playerOrder.indexOf(socketId);
        if (index > -1) {
            this.playerOrder.splice(index, 1);
            if (this.currentPlayerIndex >= this.playerOrder.length) {
                this.currentPlayerIndex = 0;
            }
        }
    }

    getPlayersInfo() {
        const info = [];
        this.players.forEach((player, id) => {
            info.push({
                id,
                name: player.name,
                cardCount: player.hand.length,
                score: player.score
            });
        });
        return info;
    }

    startGame() {
        this.gameStarted = true;
        this.deck = new Deck();
        this.deck.shuffle();
        this.table = [];
        this.currentPlayerIndex = 0;
        this.playerOrder = Array.from(this.players.keys());

        // Deal 7 cards to each player
        this.players.forEach((player) => {
            player.hand = this.deck.draw(7);
        });

        // Put one card on table to start
        this.table.push(this.deck.draw(1)[0]);
    }

    getCurrentPlayerId() {
        return this.playerOrder[this.currentPlayerIndex];
    }

    playCard(socketId, cardIndex) {
        if (!this.gameStarted) return { success: false };
        if (this.getCurrentPlayerId() !== socketId) return { success: false };

        const player = this.players.get(socketId);
        if (cardIndex < 0 || cardIndex >= player.hand.length) {
            return { success: false };
        }

        const card = player.hand.splice(cardIndex, 1)[0];
        this.table.push(card);

        this.nextTurn();
        return { success: true, card };
    }

    drawCard(socketId) {
        if (!this.gameStarted) return { success: false };
        if (this.getCurrentPlayerId() !== socketId) return { success: false };
        if (this.deck.cards.length === 0) return { success: false };

        const player = this.players.get(socketId);
        const cards = this.deck.draw(1);
        player.hand.push(...cards);

        return { success: true, card: cards[0] };
    }

    passTurn(socketId) {
        if (!this.gameStarted) return;
        if (this.getCurrentPlayerId() !== socketId) return;
        this.nextTurn();
    }

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    }

    getGameState() {
        const state = {
            started: this.gameStarted,
            currentPlayer: this.getCurrentPlayerId(),
            table: this.table,
            deckCount: this.deck ? this.deck.cards.length : 0,
            players: {}
        };

        this.players.forEach((player, id) => {
            state.players[id] = {
                name: player.name,
                cardCount: player.hand.length,
                hand: player.hand, // Server sends all hands, client shows only own
                score: player.score
            };
        });

        return state;
    }
}

module.exports = Room;
