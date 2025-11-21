export class PeerService {
    constructor(customId, onCallStream, onDataReceived) {
        this.peer = customId ? new Peer(customId) : new Peer();
        this.peers = {}; // Keep track of calls
        this.dataConnections = {}; // Keep track of chat connections
        this.myPeerId = null;
        this.onCallStream = onCallStream; // Callback when a stream is received
        this.onDataReceived = onDataReceived; // Callback when data is received

        this.initialize();
    }

    initialize() {
        this.peer.on('error', err => {
            console.error(err);
            if (err.type === 'unavailable-id') {
                alert(`The Room Name is already taken. Please choose another one.`);
                window.location.href = '/';
            }
        });

        this.peer.on('open', id => {
            this.myPeerId = id;
            console.log('My Peer ID is: ' + id);
            if (this.onOpenCallback) this.onOpenCallback(id);
        });

        this.peer.on('connection', conn => {
            this.setupDataConnection(conn);
        });
    }

    onOpen(callback) {
        this.onOpenCallback = callback;
        // If peer is already open, trigger callback immediately
        if (this.myPeerId) {
            callback(this.myPeerId);
        }
    }

    answerCalls(stream) {
        this.peer.on('call', call => {
            call.answer(stream);
            const video = document.createElement('video');
            
            call.on('stream', userVideoStream => {
                if (this.onCallStream) this.onCallStream(video, userVideoStream);
            });
            
            call.on('close', () => {
                video.remove();
            });
        });
    }

    connectToPeer(peerId, stream, myUsername) {
        if (this.dataConnections[peerId]) return;

        // 1. Call for Video
        const call = this.peer.call(peerId, stream);
        const video = document.createElement('video');
        
        call.on('stream', userVideoStream => {
            if (this.onCallStream) this.onCallStream(video, userVideoStream);
        });
        call.on('close', () => {
            video.remove();
        });
        this.peers[peerId] = call;

        // 2. Connect for Chat
        const conn = this.peer.connect(peerId);
        this.setupDataConnection(conn);
    }

    setupDataConnection(conn) {
        this.dataConnections[conn.peer] = conn;

        conn.on('open', () => {
            // Broadcast my known peers to this new connection (Mesh Networking)
            const knownPeers = Object.keys(this.dataConnections).filter(id => id !== conn.peer);
            if (knownPeers.length > 0) {
                conn.send({ type: 'peer-list', peers: knownPeers });
            }
        });

        conn.on('data', data => {
            if (data.type === 'kick') {
                window.location.href = '/?kicked=true';
                return;
            }

            if (this.onDataReceived) this.onDataReceived(data);
            
            if (data.type === 'peer-list') {
                if (this.onPeerListReceived) this.onPeerListReceived(data.peers);
            }
        });

        conn.on('close', () => {
            delete this.dataConnections[conn.peer];
            if (this.peers[conn.peer]) {
                this.peers[conn.peer].close();
                delete this.peers[conn.peer];
            }
        });
        
        conn.on('error', () => {
            delete this.dataConnections[conn.peer];
        });
    }

    kickPeer(peerId) {
        const conn = this.dataConnections[peerId];
        if (conn && conn.open) {
            conn.send({ type: 'kick' });
            // Close connection locally after sending kick message
            setTimeout(() => {
                conn.close();
                if (this.peers[peerId]) this.peers[peerId].close();
            }, 500);
        }
    }

    broadcastMessage(message, sender) {
        Object.values(this.dataConnections).forEach(conn => {
            if(conn.open) {
                conn.send({ type: 'chat', message: message, sender: sender });
            }
        });
    }

    broadcastReaction(messageIndex, reaction) {
        Object.values(this.dataConnections).forEach(conn => {
            if(conn.open) {
                conn.send({ type: 'reaction', messageIndex: messageIndex, reaction: reaction });
            }
        });
    }

    onPeerList(callback) {
        this.onPeerListReceived = callback;
    }
}
