class CardRenderer {
    static suitSymbols = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠'
    };

    // Pattern tradizionali per carte numeriche (posizioni dei semi)
    // Griglia 3x5: colonne (left, center, right) x righe (1-5)
    static suitPatterns = {
        'A': { type: 'ace' },
        '2': { positions: ['tc', 'bc'] },
        '3': { positions: ['tc', 'mc', 'bc'] },
        '4': { positions: ['tl', 'tr', 'bl', 'br'] },
        '5': { positions: ['tl', 'tr', 'mc', 'bl', 'br'] },
        '6': { positions: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'] },
        '7': { positions: ['tl', 'tr', 'ml', 'mr', 'bl', 'br', 'tmc'] },
        '8': { positions: ['tl', 'tr', 'ml', 'mr', 'bl', 'br', 'tmc', 'bmc'] },
        '9': { positions: ['tl', 'tr', 'tml', 'tmr', 'mc', 'bml', 'bmr', 'bl', 'br'] },
        '10': { positions: ['tl', 'tr', 'tml', 'tmr', 'tmc', 'bmc', 'bml', 'bmr', 'bl', 'br'] },
        'J': { type: 'face', figure: 'jack' },
        'Q': { type: 'face', figure: 'queen' },
        'K': { type: 'face', figure: 'king' }
    };

    static createCard(card, onClick = null) {
        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.suit}`;
        cardEl.dataset.suit = card.suit;
        cardEl.dataset.value = card.value;

        const symbol = this.suitSymbols[card.suit];
        const pattern = this.suitPatterns[card.value];

        let centerContent = '';

        if (pattern.type === 'ace') {
            centerContent = this.renderAce(symbol);
        } else if (pattern.type === 'face') {
            centerContent = this.renderFace(pattern.figure, symbol);
        } else {
            centerContent = this.renderPips(pattern.positions, symbol);
        }

        cardEl.innerHTML = `
            <div class="card-corner top-left">
                <span class="corner-value">${card.value}</span>
                <span class="corner-suit">${symbol}</span>
            </div>
            <div class="card-center">
                ${centerContent}
            </div>
            <div class="card-corner bottom-right">
                <span class="corner-value">${card.value}</span>
                <span class="corner-suit">${symbol}</span>
            </div>
        `;

        if (onClick) {
            cardEl.addEventListener('click', () => onClick(cardEl));
        }

        return cardEl;
    }

    static renderAce(symbol) {
        return `<div class="ace-symbol">${symbol}</div>`;
    }

    static renderFace(figure, symbol) {
        const figureSymbols = {
            jack: '🃏',
            queen: '👑',
            king: '♔'
        };

        return `
            <div class="face-card">
                <div class="face-top">
                    <div class="face-figure" data-figure="${figure}">
                        <div class="face-design">
                            <span class="face-suit top-suit">${symbol}</span>
                            <span class="face-letter">${figure.charAt(0).toUpperCase()}</span>
                            <span class="face-suit bottom-suit">${symbol}</span>
                        </div>
                    </div>
                </div>
                <div class="face-bottom">
                    <div class="face-figure" data-figure="${figure}">
                        <div class="face-design">
                            <span class="face-suit top-suit">${symbol}</span>
                            <span class="face-letter">${figure.charAt(0).toUpperCase()}</span>
                            <span class="face-suit bottom-suit">${symbol}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static renderPips(positions, symbol) {
        const positionMap = {
            // Top row
            'tl': 'pip-top-left',
            'tc': 'pip-top-center',
            'tr': 'pip-top-right',
            // Top-middle row
            'tml': 'pip-top-mid-left',
            'tmc': 'pip-top-mid-center',
            'tmr': 'pip-top-mid-right',
            // Middle row
            'ml': 'pip-mid-left',
            'mc': 'pip-mid-center',
            'mr': 'pip-mid-right',
            // Bottom-middle row
            'bml': 'pip-bot-mid-left',
            'bmc': 'pip-bot-mid-center',
            'bmr': 'pip-bot-mid-right',
            // Bottom row
            'bl': 'pip-bot-left',
            'bc': 'pip-bot-center',
            'br': 'pip-bot-right'
        };

        return `
            <div class="pip-grid">
                ${positions.map(pos => `<span class="pip ${positionMap[pos]}">${symbol}</span>`).join('')}
            </div>
        `;
    }

    static createCardBack() {
        const cardEl = document.createElement('div');
        cardEl.className = 'card card-back';
        cardEl.innerHTML = `
            <div class="card-back-pattern">
                <div class="back-design"></div>
            </div>
        `;
        return cardEl;
    }

    static renderHand(container, cards, onCardClick) {
        container.innerHTML = '';
        cards.forEach((card, index) => {
            const cardEl = this.createCard(card, (el) => {
                // Deselect others
                container.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
                el.classList.toggle('selected');
                if (onCardClick) onCardClick(index, card);
            });
            cardEl.dataset.index = index;
            container.appendChild(cardEl);
        });
    }

    static renderTable(container, cards) {
        container.innerHTML = '';
        // Show last 5 cards on table
        const visibleCards = cards.slice(-5);
        visibleCards.forEach((card, i) => {
            const cardEl = this.createCard(card);
            cardEl.style.marginLeft = i > 0 ? '-30px' : '0';
            container.appendChild(cardEl);
        });
    }
}

window.CardRenderer = CardRenderer;
