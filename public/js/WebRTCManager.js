class WebRTCManager {
    constructor(socketManager) {
        this.socketManager = socketManager;
        this.localStream = null;
        this.peers = new Map(); // peerId -> RTCPeerConnection
        this.remoteStreams = new Map(); // peerId -> MediaStream

        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.onRemoteStream = null;
        this.onRemoteStreamRemoved = null;

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socketManager.on('webrtc-offer', async (data) => {
            await this.handleOffer(data.from, data.offer);
        });

        this.socketManager.on('webrtc-answer', async (data) => {
            await this.handleAnswer(data.from, data.answer);
        });

        this.socketManager.on('webrtc-ice-candidate', async (data) => {
            await this.handleIceCandidate(data.from, data.candidate);
        });

        this.socketManager.on('player-left', (data) => {
            this.removePeer(data.id);
        });
    }

    async initLocalStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            // Try with only audio
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true
                });
                return this.localStream;
            } catch (audioError) {
                console.error('Error accessing audio:', audioError);
                return null;
            }
        }
    }

    async connectToPeer(peerId) {
        if (this.peers.has(peerId)) return;

        const pc = this.createPeerConnection(peerId);
        this.peers.set(peerId, pc);

        // Add local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socketManager.sendOffer(peerId, offer);
    }

    createPeerConnection(peerId) {
        const pc = new RTCPeerConnection(this.config);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socketManager.sendIceCandidate(peerId, event.candidate);
            }
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0];
            this.remoteStreams.set(peerId, stream);
            if (this.onRemoteStream) {
                this.onRemoteStream(peerId, stream);
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                this.removePeer(peerId);
            }
        };

        return pc;
    }

    async handleOffer(fromId, offer) {
        let pc = this.peers.get(fromId);

        if (!pc) {
            pc = this.createPeerConnection(fromId);
            this.peers.set(fromId, pc);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Add local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                const senders = pc.getSenders();
                const trackExists = senders.some(s => s.track === track);
                if (!trackExists) {
                    pc.addTrack(track, this.localStream);
                }
            });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socketManager.sendAnswer(fromId, answer);
    }

    async handleAnswer(fromId, answer) {
        const pc = this.peers.get(fromId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    async handleIceCandidate(fromId, candidate) {
        const pc = this.peers.get(fromId);
        if (pc && candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    }

    removePeer(peerId) {
        const pc = this.peers.get(peerId);
        if (pc) {
            pc.close();
            this.peers.delete(peerId);
        }
        this.remoteStreams.delete(peerId);
        if (this.onRemoteStreamRemoved) {
            this.onRemoteStreamRemoved(peerId);
        }
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return !audioTrack.enabled; // return true if muted
            }
        }
        return false;
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                return !videoTrack.enabled; // return true if video off
            }
        }
        return false;
    }

    cleanup() {
        this.peers.forEach(pc => pc.close());
        this.peers.clear();
        this.remoteStreams.clear();
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
    }
}

window.WebRTCManager = WebRTCManager;
