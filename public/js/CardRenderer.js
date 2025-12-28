class CardRenderer {
    static suitSymbols = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠'
    };

    static createCard(card, onClick = null) {
        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.suit}`;
        cardEl.dataset.suit = card.suit;
        cardEl.dataset.value = card.value;

        const symbol = this.suitSymbols[card.suit];

        cardEl.innerHTML = `
            <span class="value">${card.value}${symbol}</span>
            <span class="suit">${symbol}</span>
            <span class="value value-bottom">${card.value}${symbol}</span>
        `;

        if (onClick) {
            cardEl.addEventListener('click', () => onClick(cardEl));
        }

        return cardEl;
    }

    static createCardBack() {
        const cardEl = document.createElement('div');
        cardEl.className = 'card card-back';
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
