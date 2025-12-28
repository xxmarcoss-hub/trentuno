# Issue #001: Migliorare la visualizzazione delle carte francesi

## Problema attuale

Le carte sono renderizzate in modo troppo semplice:
- Solo valore e simbolo del seme
- Nessun pattern di semi al centro
- Figure (J, Q, K) senza illustrazioni
- Layout non realistico

## Come dovrebbero essere le carte francesi

### Carte numeriche (2-10)
- **Angoli**: Valore sopra, simbolo seme sotto (piccoli, in alto a sinistra e ruotati in basso a destra)
- **Centro**: Pattern di semi disposti secondo schemi tradizionali:
  - 2: due semi verticali
  - 3: tre semi in diagonale
  - 4: quattro semi agli angoli
  - 5: quattro agli angoli + uno al centro
  - 6: due colonne da 3
  - 7: come il 6 + uno al centro in alto
  - 8: come il 6 + due al centro
  - 9: quattro + quattro + uno al centro
  - 10: quattro + due + quattro pattern

### Figure (J, Q, K)
- **Jack (Fante)**: Figura stilizzata di un giovane nobile
- **Queen (Regina)**: Figura stilizzata di una regina
- **King (Re)**: Figura stilizzata di un re
- Tradizionalmente sono "a due teste" (simmetriche verticalmente)

### Asso
- Grande simbolo del seme al centro
- Design elaborato, specialmente l'Asso di Picche

## Soluzione proposta

### Opzione 1: CSS puro con pattern di semi
Usare CSS Grid/Flexbox per posizionare i semi secondo i pattern tradizionali.

### Opzione 2: SVG per le figure
Creare o usare SVG per J, Q, K con design classico.

### Opzione 3: Immagini sprite
Usare uno sprite sheet con tutte le 52 carte.

## File da modificare
- `public/js/CardRenderer.js` - Logica di rendering
- `public/css/style.css` - Stili carte

## Priorità
Alta - L'aspetto visivo delle carte è fondamentale per l'esperienza di gioco.
