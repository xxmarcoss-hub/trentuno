const Deck = require('./Deck');

class Room {
    constructor(code, initialPot = 10) {
        this.code = code;
        this.players = new Map(); // socketId -> { name, hand, coins, score, hasDrawn }
        this.deck = null;
        this.discardPile = [];          // Pozzo degli scarti
        this.currentPlayerIndex = 0;
        this.gameStarted = false;
        this.playerOrder = [];          // Array of socket IDs in play order

        // Proprietà per Trentuno
        this.dealerIndex = 0;           // Indice del mazziere corrente
        this.pot = initialPot;          // Gruzzolo monete d'oro
        this.roundActive = false;       // Se una mano è in corso
        this.knocker = null;            // socketId di chi ha bussato
        this.knockTurnsRemaining = 0;   // Turni rimanenti dopo bussata
        this.winner31 = null;           // socketId di chi dichiara 31
        this.roundNumber = 0;           // Numero della mano corrente
    }

    addPlayer(socketId, name) {
        this.players.set(socketId, {
            name,
            hand: [],
            coins: 0,       // Monete vinte
            score: 0,       // Punteggio mano corrente
            hasDrawn: false // Se ha già pescato in questo turno
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
                score: player.score,
                coins: player.coins
            });
        });
        return info;
    }

    // Calcola il valore di una singola carta
    getCardValue(card) {
        if (card.value === 'A') return 11;
        if (['K', 'Q', 'J'].includes(card.value)) return 10;
        return parseInt(card.value);
    }

    // Calcola il punteggio della mano (somma max carte dello stesso seme)
    calculateHandScore(hand) {
        const suitScores = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };

        for (const card of hand) {
            suitScores[card.suit] += this.getCardValue(card);
        }

        return Math.max(...Object.values(suitScores));
    }

    // Aggiorna il punteggio di un giocatore
    updatePlayerScore(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            player.score = this.calculateHandScore(player.hand);
        }
    }

    // Inizia la partita (prima mano)
    startGame() {
        this.gameStarted = true;
        this.playerOrder = Array.from(this.players.keys());
        this.dealerIndex = 0;
        this.startRound();
    }

    // Inizia una nuova mano
    startRound() {
        this.roundActive = true;
        this.roundNumber++;
        this.knocker = null;
        this.knockTurnsRemaining = 0;
        this.winner31 = null;

        // Crea e mescola nuovo mazzo
        this.deck = new Deck();
        this.deck.shuffle();
        this.discardPile = [];

        // Ruota mazziere (dalla seconda mano in poi)
        if (this.roundNumber > 1) {
            this.dealerIndex = (this.dealerIndex + 1) % this.playerOrder.length;
        }

        // Primo giocatore = dopo il mazziere
        this.currentPlayerIndex = (this.dealerIndex + 1) % this.playerOrder.length;

        // Distribuisci 3 carte a ogni giocatore e resetta hasDrawn
        this.players.forEach((player) => {
            player.hand = this.deck.draw(3);
            player.score = this.calculateHandScore(player.hand);
            player.hasDrawn = false;
        });

        // Una carta scoperta nel pozzo
        this.discardPile.push(this.deck.draw(1)[0]);
    }

    getCurrentPlayerId() {
        return this.playerOrder[this.currentPlayerIndex];
    }

    // Verifica se è il turno del giocatore e la mano è attiva
    isValidTurn(socketId) {
        if (!this.roundActive) return false;
        if (this.getCurrentPlayerId() !== socketId) return false;
        return true;
    }

    // Pesca una carta (dal mazzo o dal pozzo) - FASE 1
    drawCard(socketId, source) {
        if (!this.isValidTurn(socketId)) return { success: false, error: 'Non è il tuo turno' };

        const player = this.players.get(socketId);
        if (player.hasDrawn) return { success: false, error: 'Hai già pescato' };

        let drawnCard;

        if (source === 'discard') {
            if (this.discardPile.length === 0) return { success: false, error: 'Pozzo vuoto' };
            drawnCard = this.discardPile.pop();
        } else if (source === 'deck') {
            // Se mazzo vuoto, ricicla pozzo
            if (this.deck.cards.length === 0) {
                this.recycleDeck();
            }
            if (this.deck.cards.length === 0) return { success: false, error: 'Mazzo vuoto' };
            drawnCard = this.deck.draw(1)[0];
        } else {
            return { success: false, error: 'Sorgente non valida' };
        }

        // Aggiungi carta alla mano (ora ha 4 carte)
        player.hand.push(drawnCard);
        player.hasDrawn = true;
        player.score = this.calculateHandScore(player.hand);

        return {
            success: true,
            action: source === 'discard' ? 'draw-from-discard' : 'draw-from-deck',
            drawnCard: drawnCard
        };
    }

    // Scarta una carta - FASE 2
    discardCard(socketId, cardIndex) {
        if (!this.isValidTurn(socketId)) return { success: false, error: 'Non è il tuo turno' };

        const player = this.players.get(socketId);
        if (!player.hasDrawn) return { success: false, error: 'Devi prima pescare' };
        if (cardIndex < 0 || cardIndex >= player.hand.length) {
            return { success: false, error: 'Indice carta non valido' };
        }

        // Scarta la carta
        const discardedCard = player.hand.splice(cardIndex, 1)[0];
        this.discardPile.push(discardedCard);

        // Aggiorna punteggio
        player.score = this.calculateHandScore(player.hand);
        player.hasDrawn = false;

        // Avanza turno
        const turnResult = this.advanceTurn();

        return {
            success: true,
            action: 'discard',
            discardedCard: discardedCard,
            roundEnd: turnResult
        };
    }

    // Bussa
    knock(socketId) {
        if (!this.isValidTurn(socketId)) return { success: false };
        if (this.knocker) return { success: false }; // Qualcuno ha già bussato

        const player = this.players.get(socketId);
        if (player.hasDrawn) return { success: false, error: 'Devi prima scartare' };

        this.knocker = socketId;
        // Ogni altro giocatore fa ancora un turno
        // Usiamo playerOrder.length perché advanceTurn() decrementa subito dopo knock()
        this.knockTurnsRemaining = this.playerOrder.length;

        const turnResult = this.advanceTurn();

        return {
            success: true,
            action: 'knock',
            knocker: socketId,
            knockerName: this.players.get(socketId).name,
            roundEnd: turnResult
        };
    }

    // Dichiara 31
    declare31(socketId) {
        if (!this.isValidTurn(socketId)) return { success: false };

        const player = this.players.get(socketId);
        if (player.hasDrawn) return { success: false, error: 'Devi prima scartare' };
        if (player.score !== 31) return { success: false };

        this.winner31 = socketId;
        const roundResult = this.endRound('31-declared');

        return {
            success: true,
            action: 'declare-31',
            roundEnd: roundResult
        };
    }

    // Ricicla il pozzo quando mazzo finito
    recycleDeck() {
        if (this.discardPile.length <= 1) return;

        // Tieni l'ultima carta nel pozzo
        const topCard = this.discardPile.pop();
        // Il resto diventa il nuovo mazzo
        this.deck.cards = [...this.discardPile];
        this.discardPile = [topCard];
        this.deck.shuffle();
    }

    // Avanza al prossimo turno
    advanceTurn() {
        // Resetta hasDrawn per il giocatore corrente
        const currentPlayer = this.players.get(this.getCurrentPlayerId());
        if (currentPlayer) {
            currentPlayer.hasDrawn = false;
        }

        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;

        // Se qualcuno ha bussato, decrementa contatore
        if (this.knocker) {
            this.knockTurnsRemaining--;
            if (this.knockTurnsRemaining <= 0) {
                // Ultimo turno completato dopo bussata
                return this.endRound('knock-complete');
            }
        }

        return null;
    }

    // Fine mano e distribuzione monete
    endRound(reason) {
        this.roundActive = false;

        const results = {
            reason,
            players: {},
            winners: [],
            coinsAwarded: 0,
            potRemaining: this.pot,
            gameOver: false,
            finalWinners: null
        };

        // Raccogli info su tutti i giocatori
        this.players.forEach((player, id) => {
            results.players[id] = {
                name: player.name,
                hand: [...player.hand],
                score: player.score,
                coins: player.coins
            };
        });

        if (reason === '31-declared') {
            // Vince chi ha dichiarato 31 (2 monete)
            results.winners = [this.winner31];
            results.coinsAwarded = 2;
        } else {
            // Bussata completata: vince chi ha punteggio più alto
            let maxScore = 0;

            // Prima trova il punteggio massimo
            this.players.forEach((player) => {
                if (player.score > maxScore) {
                    maxScore = player.score;
                }
            });

            // Poi trova tutti i giocatori con quel punteggio
            this.players.forEach((player, id) => {
                if (player.score === maxScore) {
                    results.winners.push(id);
                }
            });

            results.coinsAwarded = 1;
        }

        // Calcola monete necessarie
        const coinsNeeded = results.winners.length * results.coinsAwarded;

        // Aggiungi monete extra se necessario
        if (this.pot < coinsNeeded) {
            this.pot = coinsNeeded;
        }

        // Distribuisci monete ai vincitori
        results.winners.forEach(winnerId => {
            const player = this.players.get(winnerId);
            player.coins += results.coinsAwarded;
            this.pot -= results.coinsAwarded;
        });

        results.potRemaining = this.pot;

        // Aggiorna i dati dei giocatori nei risultati
        this.players.forEach((player, id) => {
            results.players[id].coins = player.coins;
        });

        // Controlla fine partita
        if (this.pot <= 0) {
            results.gameOver = true;
            results.finalWinners = this.getFinalWinners();
        }

        return results;
    }

    // Trova i vincitori finali della partita
    getFinalWinners() {
        let maxCoins = 0;
        let winners = [];

        this.players.forEach((player, id) => {
            if (player.coins > maxCoins) {
                maxCoins = player.coins;
                winners = [{ id, name: player.name, coins: player.coins }];
            } else if (player.coins === maxCoins) {
                winners.push({ id, name: player.name, coins: player.coins });
            }
        });

        return winners;
    }

    getGameState() {
        const topDiscard = this.discardPile.length > 0
            ? this.discardPile[this.discardPile.length - 1]
            : null;

        const currentPlayerId = this.getCurrentPlayerId();
        const currentPlayerData = this.players.get(currentPlayerId);

        const state = {
            started: this.gameStarted,
            roundActive: this.roundActive,
            roundNumber: this.roundNumber,
            currentPlayer: currentPlayerId,
            currentPlayerHasDrawn: currentPlayerData?.hasDrawn || false,
            dealerIndex: this.dealerIndex,
            dealer: this.playerOrder[this.dealerIndex],
            discardPile: this.discardPile,
            topDiscard: topDiscard,
            deckCount: this.deck ? this.deck.cards.length : 0,
            pot: this.pot,
            knocker: this.knocker,
            knockerName: this.knocker ? this.players.get(this.knocker)?.name : null,
            knockTurnsRemaining: this.knockTurnsRemaining,
            playerOrder: this.playerOrder,
            players: {}
        };

        this.players.forEach((player, id) => {
            state.players[id] = {
                name: player.name,
                cardCount: player.hand.length,
                hand: player.hand,
                score: player.score,
                coins: player.coins,
                hasDrawn: player.hasDrawn
            };
        });

        return state;
    }
}

module.exports = Room;
