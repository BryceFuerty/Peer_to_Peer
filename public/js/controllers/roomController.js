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
                    this.isHost = true; // Mark as host if created with customId
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
        } else if (data.type === 'reaction') {
            this.addReaction(data.messageIndex, data.reaction, false);
        }
    }

    setupUI() {
        // Chat toggle button
        const chatButton = Array.from(document.querySelectorAll('.main__controls__button')).find(btn => 
            btn.querySelector('.fa-comment-alt')
        );
        
        if (chatButton) {
            chatButton.onclick = () => this.toggleChat();
        }

        // Close chat button
        const closeBtn = document.getElementById('close-chat');
        if (closeBtn) {
            closeBtn.onclick = () => this.toggleChat();
        }

        // Emoji button
        const emojiBtn = document.getElementById('emoji-btn');
        if (emojiBtn) {
            emojiBtn.onclick = () => this.toggleEmojiPicker();
        }

        // File button
        const fileBtn = document.getElementById('file-btn');
        const fileInput = document.getElementById('file-input');
        if (fileBtn && fileInput) {
            fileBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => this.handleFileSelect(e);
        }

        // Chat
        const text = document.querySelector("#chat_message");
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && text.value.length !== 0) {
                const message = text.value;
                
                // Check for kick command: /kick peerId
                if (this.isHost && message.startsWith('/kick ')) {
                    const peerIdToKick = message.split(' ')[1];
                    if (peerIdToKick) {
                        this.peerService.kickPeer(peerIdToKick);
                        this.createMessage(`Kicked user ${peerIdToKick}`, 'System');
                        text.value = '';
                        return;
                    }
                }

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
            if (btn.querySelector('.fa-user-friends')) {
                btn.onclick = () => this.showParticipants();
            }
            // Leave button
            if (btn.querySelector('.leave_meeting') || btn.innerText.includes('Leave Meeting')) {
                btn.onclick = () => this.leaveMeeting();
            }
        });
    }

    showParticipants() {
        const peers = Object.keys(this.peerService.dataConnections);
        if (peers.length === 0) {
            this.createMessage("No other participants connected.", "System");
        } else {
            const list = peers.join('\n- ');
            this.createMessage(`Connected Participants (${peers.length}):\n- ${list}`, "System");
        }
    }

    createMessage(message, sender) {
        const messages = document.querySelector(".messages");
        const li = document.createElement('li');
        
        const senderDiv = document.createElement('div');
        senderDiv.className = 'message-sender';
        senderDiv.textContent = sender;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = message;
        
        const reactionsDiv = document.createElement('div');
        reactionsDiv.className = 'message-reactions';
        reactionsDiv.dataset.messageIndex = messages.children.length;
        
        // Common reactions - Initialize with count = 0
        const reactions = ['👍', '❤️', '😂', '😢', '🎉'];
        reactions.forEach(reaction => {
            const btn = document.createElement('button');
            btn.className = 'reaction-btn';
            btn.textContent = reaction;
            btn.dataset.count = 0;
            btn.onclick = () => this.broadcastReaction(reactionsDiv.dataset.messageIndex, reaction);
            reactionsDiv.appendChild(btn);
        });
        
        // Add reaction button
        const addBtn = document.createElement('button');
        addBtn.className = 'add-reaction-btn';
        addBtn.textContent = '+';
        addBtn.onclick = () => this.showReactionPicker(reactionsDiv);
        reactionsDiv.appendChild(addBtn);
        
        li.appendChild(senderDiv);
        li.appendChild(textDiv);
        li.appendChild(reactionsDiv);
        
        messages.append(li);
        this.scrollToBottom();
    }

    broadcastReaction(messageIndex, reaction) {
        this.peerService.broadcastReaction(messageIndex, reaction);
        this.addReaction(messageIndex, reaction, true);
    }

    addReaction(messageIndex, reaction, isLocal = true) {
        const messages = document.querySelectorAll('.messages li');
        if (messages[messageIndex]) {
            const reactionsDiv = messages[messageIndex].querySelector('.message-reactions');
            let existingBtn = Array.from(reactionsDiv.children).find(btn => 
                btn.classList.contains('reaction-btn') && btn.textContent.split(' ')[0] === reaction
            );
            
            if (existingBtn) {
                const currentCount = parseInt(existingBtn.dataset.count) || 0;
                
                // Si click local, toggle (si actif, retirer ; si inactif, ajouter)
                if (isLocal && existingBtn.classList.contains('active')) {
                    if (currentCount <= 1) {
                        existingBtn.textContent = reaction;
                        existingBtn.dataset.count = 0;
                        existingBtn.classList.remove('active');
                    } else {
                        existingBtn.textContent = `${reaction} ${currentCount - 1}`;
                        existingBtn.dataset.count = currentCount - 1;
                        existingBtn.classList.remove('active');
                    }
                } else {
                    // Si réception externe ou click sur inactif, ajouter
                    const newCount = currentCount + 1;
                    existingBtn.textContent = newCount === 1 ? reaction : `${reaction} ${newCount}`;
                    existingBtn.dataset.count = newCount;
                    if (isLocal) {
                        existingBtn.classList.add('active');
                    }
                }
            }
        }
    }

    showReactionPicker(reactionsDiv) {
        const allReactions = ['👍', '❤️', '😂', '😢', '🎉', '😍', '🔥', '💯', '✨', '😎'];
        const picked = prompt(`Pick a reaction: ${allReactions.join(' ')}`, '👍');
        if (picked && allReactions.includes(picked)) {
            this.broadcastReaction(reactionsDiv.dataset.messageIndex, picked);
        }
    }

    toggleChat() {
        const chatPanel = document.getElementById('chat-panel');
        const main = document.querySelector('.main');
        chatPanel.classList.toggle('hidden');
        main.classList.toggle('chat-closed');
    }

    toggleEmojiPicker() {
        let picker = document.getElementById('emoji-picker');
        
        if (picker) {
            picker.remove();
            return;
        }

        picker = document.createElement('div');
        picker.id = 'emoji-picker';
        picker.className = 'emoji-picker';
        
        const emojis = ['😀', '😂', '😍', '🥰', '😘', '😭', '🤔', '😡', '👍', '👎', '🔥', '💯', '✨', '🎉', '🎊', '🚀', '💯', '❤️', '💔', '💕', '💖', '💗', '💘', '🎁', '🎈', '🌟', '⭐', '✨', '🌈', '☀️', '🌙', '⚡'];
        
        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.textContent = emoji;
            btn.onclick = () => this.insertEmoji(emoji);
            picker.appendChild(btn);
        });

        const chatPanel = document.getElementById('chat-panel');
        chatPanel.appendChild(picker);
    }

    insertEmoji(emoji) {
        const input = document.getElementById('chat_message');
        input.value += emoji;
        input.focus();
        
        // Remove emoji picker after selection
        const picker = document.getElementById('emoji-picker');
        if (picker) picker.remove();
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const fileName = file.name;
            const fileSize = (file.size / 1024).toFixed(2);
            const message = `📎 ${fileName} (${fileSize}KB)`;
            
            this.peerService.broadcastMessage(message, this.myUsername);
            this.createMessage(message, 'Me');
            
            // Reset file input
            document.getElementById('file-input').value = '';
        }
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
