import { VideoService } from '../services/videoService.js';
import { PeerService } from '../services/peerService.js';
import { SocketService } from '../services/socketService.js';

export class RoomController {
    constructor() {
        this.videoService = new VideoService('video-grid');
        this.socketService = new SocketService();
        
        const urlParams = new URLSearchParams(window.location.search);
        this.connectToId = urlParams.get('connectTo');
        this.myUsername = urlParams.get('username') || 'Anonymous';
        this.customId = urlParams.get('customId');

        this.peerService = new PeerService(
            this.customId, 
            (video, stream) => this.videoService.addVideoStream(video, stream),
            (data) => this.handleData(data)
        );

        this.init();
    }

    async init() {
        try {
            const stream = await this.videoService.getVideoStream();
            
            this.peerService.answerCalls(stream);
            
            this.peerService.onOpen((id) => {
                if (this.customId) {
                    this.socketService.emit('announce-room', this.customId);
                }
                
                if (this.connectToId) {
                    this.peerService.connectToPeer(this.connectToId, stream, this.myUsername);
                }
            });

            this.peerService.onPeerList((peers) => {
                peers.forEach(otherPeerId => {
                    if (otherPeerId !== this.peerService.myPeerId && !this.peerService.dataConnections[otherPeerId]) {
                        this.peerService.connectToPeer(otherPeerId, stream, this.myUsername);
                    }
                });
            });

            this.setupUI();
        } catch (err) {
            console.error("Failed to init room:", err);
        }
    }

    handleData(data) {
        if (data.type === 'chat') {
            this.createMessage(data.message, data.sender || 'User');
        }
    }

    setupUI() {
        // Chat
        const text = document.querySelector("#chat_message");
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && text.value.length !== 0) {
                const message = text.value;
                this.peerService.broadcastMessage(message, this.myUsername);
                this.createMessage(message, 'Me');
                text.value = '';
            }
        });

        // Buttons - Attach listeners programmatically
        const muteBtn = document.querySelector('.main__mute_button');
        if (muteBtn) {
            muteBtn.onclick = (e) => {
                e.preventDefault();
                this.muteUnmute();
            };
        }

        const videoBtn = document.querySelector('.main__video_button');
        if (videoBtn) {
            videoBtn.onclick = (e) => {
                e.preventDefault();
                this.playStop();
            };
        }
        
        // Info button
        // We need to find the button that had the prompt onclick
        // It has class main__controls__button and contains fa-info-circle
        const buttons = document.querySelectorAll('.main__controls__button');
        buttons.forEach(btn => {
            if (btn.querySelector('.fa-info-circle')) {
                btn.onclick = () => prompt('My Peer ID:', this.peerService.myPeerId);
            }
            // Leave button
            if (btn.querySelector('.leave_meeting') || btn.innerText.includes('Leave Meeting')) {
                btn.onclick = () => this.leaveMeeting();
            }
        });
    }

    createMessage(message, sender) {
        const messages = document.querySelector(".messages");
        const li = document.createElement('li');
        const senderElem = document.createElement('b');
        senderElem.textContent = sender;
        
        li.appendChild(senderElem);
        li.appendChild(document.createElement('br'));
        li.appendChild(document.createTextNode(message));
        
        messages.append(li);
        this.scrollToBottom();
    }

    scrollToBottom() {
        let d = document.querySelector('.main__chat_window');
        d.scrollTop = d.scrollHeight;
    }

    muteUnmute() {
        const isMuted = this.videoService.muteUnmute();
        this.setMuteButton(isMuted);
    }

    playStop() {
        const isStopped = this.videoService.playStop();
        this.setPlayVideoButton(isStopped);
    }

    setMuteButton(isMuted) {
        const html = isMuted 
            ? `<i class="unmute fas fa-microphone-slash"></i><span>Unmute</span>`
            : `<i class="fas fa-microphone"></i><span>Mute</span>`;
        document.querySelector('.main__mute_button').innerHTML = html;
    }

    setPlayVideoButton(isStopped) {
        const html = isStopped
            ? `<i class="stop fas fa-video-slash"></i><span>Play Video</span>`
            : `<i class="fas fa-video"></i><span>Stop Video</span>`;
        document.querySelector('.main__video_button').innerHTML = html;
    }

    leaveMeeting() {
        window.location.href = '/';
    }
}
