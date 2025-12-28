# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Start server**: `npm start` (runs on http://localhost:3000)
- **Install dependencies**: `npm install`

## Architecture

This is a multiplayer online card game with video chat, built with Express, Socket.IO, and WebRTC.

### Server (CommonJS)

- `server/index.js` - Express server with Socket.IO handling: room management, WebRTC signaling relay, game events
- `server/Room.js` - Game room state: players, deck, table, turn management, game logic
- `server/Deck.js` - Standard 52-card deck with Fisher-Yates shuffle

### Client (Vanilla JS, global classes on window)

- `public/js/app.js` - Main entry point, wires together UI, sockets, and WebRTC
- `public/js/GameUI.js` - DOM manipulation, screen transitions, game state rendering
- `public/js/SocketManager.js` - Socket.IO wrapper for room/game events
- `public/js/WebRTCManager.js` - Peer-to-peer video/audio using STUN servers
- `public/js/CardRenderer.js` - Card DOM element creation and rendering

### Communication Flow

1. Players create/join rooms via Socket.IO (room codes are 6-char alphanumeric)
2. WebRTC signaling (offer/answer/ICE) relayed through server
3. Game state changes broadcast to room via `game-update` events
4. Server sends full game state; client filters to show only own hand

### Key Patterns

- Room state stored in `Map<code, Room>` on server
- Socket properties `roomCode` and `playerName` track player context
- Max 5 players per room, min 2 to start
- UI is Italian (`it` locale in HTML)
