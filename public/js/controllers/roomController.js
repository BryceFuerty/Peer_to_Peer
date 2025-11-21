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
                    this.isHost = true; 
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
        console.log('Received data:', data);
        if (data.type === 'chat') {
            console.log('Creating message from peer:', data.sender, data.messageId);
            this.createMessage(data.message, data.sender || 'User', data.messageId);
        } else if (data.type === 'reaction') {
            console.log('Received reaction:', data.reaction, 'for message:', data.messageId);
            this.addReaction(data.messageId, data.reaction, false);
        }
    }

    setupUI() {
        // Easter egg - Logo Skoupe
        const skoupeLogo = document.getElementById('skoupe-logo');
        let clickCount = 0;
        if (skoupeLogo) {
            skoupeLogo.onclick = () => {
                clickCount++;
                skoupeLogo.style.transform = `rotate(${clickCount * 360}deg) scale(1.1)`;
                
                if (clickCount === 1) {
                    skoupeLogo.style.filter = 'brightness(1.5) hue-rotate(45deg)';
                } else if (clickCount === 2) {
                    skoupeLogo.style.filter = 'brightness(0.8) invert(1)';
                } else if (clickCount === 3) {
                    skoupeLogo.style.filter = 'drop-shadow(0 0 10px #4FC3F7)';
                } else if (clickCount >= 4) {
                    skoupeLogo.style.filter = 'drop-shadow(0 0 20px #FF1493) brightness(1.2)';
                }
                
                setTimeout(() => {
                    skoupeLogo.style.transform = 'rotate(0deg) scale(1)';
                }, 600);
                
                if (clickCount >= 5) {
                    this.createMessage('🎉 Vous avez trouvé l\'Easter egg! 🎉', 'System');
                    clickCount = 0;
                    skoupeLogo.style.filter = 'none';
                }
            };
        }

        const chatButton = Array.from(document.querySelectorAll('.main__controls__button')).find(btn => 
            btn.querySelector('.fa-comment-alt')
        );
        
        if (chatButton) {
            chatButton.onclick = () => this.toggleChat();
        }

        const closeBtn = document.getElementById('close-chat');
        if (closeBtn) {
            closeBtn.onclick = () => this.toggleChat();
        }

        const emojiBtn = document.getElementById('emoji-btn');
        if (emojiBtn) {
            emojiBtn.onclick = () => this.toggleEmojiPicker();
        }

        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.onclick = () => this.sendMessage();
        }

        const text = document.querySelector("#chat_message");
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && text.value.length !== 0) {
                e.preventDefault();
                this.sendMessage();
            }
        });

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

    createMessage(message, sender, messageId = null) {
        const messages = document.querySelector(".messages");
        const li = document.createElement('li');
        
        // Créer un ID unique pour le message ou utiliser celui fourni
        if (!messageId) {
            messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        li.dataset.messageId = messageId;
        
        const senderDiv = document.createElement('div');
        senderDiv.className = 'message-sender';
        senderDiv.textContent = sender;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = message;
        
        // const reactionsDiv = document.createElement('div');
        // reactionsDiv.className = 'message-reactions';
        // reactionsDiv.dataset.messageId = messageId;
        
        // const reactions = ['👍', '❤️', '😂', '😢', '🎉'];
        // reactions.forEach(reaction => {
        //     const btn = document.createElement('button');
        //     btn.className = 'reaction-btn';
        //     btn.textContent = reaction;
        //     btn.dataset.count = 0;
        //     btn.onclick = () => this.broadcastReaction(reactionsDiv.dataset.messageId, reaction);
        //     reactionsDiv.appendChild(btn);
        // });
        
        // const addBtn = document.createElement('button');
        // addBtn.className = 'add-reaction-btn';
        // addBtn.textContent = '+';
        // addBtn.onclick = () => this.showReactionPicker(reactionsDiv);
        // reactionsDiv.appendChild(addBtn);
        
        li.appendChild(senderDiv);
        li.appendChild(textDiv);
        // li.appendChild(reactionsDiv);
        
        messages.append(li);
        this.scrollToBottom();
    }

    // broadcastReaction(messageId, reaction) {
    //     console.log(`Broadcasting reaction: ${reaction} for message ${messageId}`);
    //     this.peerService.broadcastReaction(messageId, reaction);
    //     this.addReaction(messageId, reaction, true);
    // }

    // addReaction(messageId, reaction, isLocal = true) {
    //     console.log(`Adding reaction: ${reaction} to message ${messageId}, isLocal: ${isLocal}`);
    //     const messageElement = document.querySelector(`li[data-message-id="${messageId}"]`);
    //     if (!messageElement) {
    //         console.log(`Message not found for ID: ${messageId}`);
    //         return;
    //     }
    //     
    //     const reactionsDiv = messageElement.querySelector('.message-reactions');
    //     if (!reactionsDiv) {
    //         console.log(`Reactions div not found for message ${messageId}`);
    //         return;
    //     }
    //     
    //     // Chercher le bouton existant - extraire juste l'emoji
    //     let existingBtn = Array.from(reactionsDiv.querySelectorAll('.reaction-btn')).find(btn => {
    //         const btnEmoji = btn.textContent.trim().split(' ')[0];
    //         return btnEmoji === reaction;
    //     });
    //     
    //     if (existingBtn) {
    //         console.log(`Found existing button for ${reaction}`);
    //         const currentCount = parseInt(existingBtn.dataset.count) || 0;
    //         
    //         if (isLocal && existingBtn.classList.contains('active')) {
    //             // Toggle off pour local
    //             if (currentCount <= 1) {
    //                 existingBtn.textContent = reaction;
    //                 existingBtn.dataset.count = 0;
    //                 existingBtn.classList.remove('active');
    //             } else {
    //                 existingBtn.textContent = `${reaction} ${currentCount - 1}`;
    //                 existingBtn.dataset.count = currentCount - 1;
    //                 existingBtn.classList.remove('active');
    //             }
    //         } else {
    //             // Incrémenter le count
    //             const newCount = currentCount + 1;
    //             existingBtn.textContent = newCount === 1 ? reaction : `${reaction} ${newCount}`;
    //             existingBtn.dataset.count = newCount;
    //             if (isLocal) {
    //                 existingBtn.classList.add('active');
    //             }
    //         }
    //     } else {
    //         // Créer un nouveau bouton de réaction
    //         console.log(`Creating new button for ${reaction}`);
    //         const newBtn = document.createElement('button');
    //         newBtn.className = isLocal ? 'reaction-btn active' : 'reaction-btn';
    //         newBtn.textContent = reaction;
    //         newBtn.dataset.count = 1;
    //         newBtn.onclick = () => this.broadcastReaction(messageId, reaction);
    //         
    //         const addBtn = reactionsDiv.querySelector('.add-reaction-btn');
    //         if (addBtn) {
    //             reactionsDiv.insertBefore(newBtn, addBtn);
    //         } else {
    //             reactionsDiv.appendChild(newBtn);
    //         }
    //     }
    // }

    showReactionPicker(reactionsDiv) {
        let existingPicker = document.getElementById('reaction-picker');
        if (existingPicker) {
            existingPicker.remove();
            document.removeEventListener('click', this.closeReactionPickerOnClickOutside);
            return;
        }

        const allReactions = ['👍', '❤️', '😂', '😢', '🎉', '😍', '🔥', '💯', '✨', '😎', '🚀', '💎', '🎁', '⭐', '🌟', '😡', '😱', '🤔', '😴', '🥳', '🤩', '🤮', '😈', '👿', '💪', '👏', '🙌', '👐', '🤝', '💝', '💖', '💗', '💘', '💞', '💕'];
        
        const picker = document.createElement('div');
        picker.id = 'reaction-picker';
        picker.className = 'reaction-picker';
        
        const messageId = reactionsDiv.dataset.messageId;
        
        allReactions.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'reaction-picker-btn';
            btn.textContent = emoji;
            btn.onclick = () => {
                this.broadcastReaction(messageId, emoji);
                picker.remove();
                document.removeEventListener('click', this.closeReactionPickerOnClickOutside);
            };
            picker.appendChild(btn);
        });

        reactionsDiv.appendChild(picker);
        
        // Ajouter écouteur pour fermer en cliquant en dehors
        setTimeout(() => {
            this.closeReactionPickerOnClickOutside = (e) => {
                if (!picker.contains(e.target) && !e.target.classList.contains('add-reaction-btn')) {
                    picker.remove();
                    document.removeEventListener('click', this.closeReactionPickerOnClickOutside);
                }
            };
            document.addEventListener('click', this.closeReactionPickerOnClickOutside);
        }, 0);
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
            document.removeEventListener('click', this.closePickerOnClickOutside);
            return;
        }

        picker = document.createElement('div');
        picker.id = 'emoji-picker';
        picker.className = 'emoji-picker';
        
        const emojis = ['😀', '😂', '😍', '🥰', '😘', '😭', '🤔', '😡', '👍', '👎', '🔥', '💯', '✨', '🎉', '🎊', '🚀', '💎', '🎁', '⭐', '🌟', '😱', '🤩', '💪', '🙌', '💝', '💖', '💗', '💘', '💕', '❤️', '🧡', '💛', '💚', '💙'];
        
        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.textContent = emoji;
            btn.onclick = () => this.insertEmoji(emoji);
            picker.appendChild(btn);
        });

        const chatPanel = document.getElementById('chat-panel');
        chatPanel.appendChild(picker);
        
        // Ajouter écouteur pour fermer en cliquant en dehors
        setTimeout(() => {
            this.closePickerOnClickOutside = (e) => {
                if (!picker.contains(e.target) && e.target.id !== 'emoji-btn') {
                    picker.remove();
                    document.removeEventListener('click', this.closePickerOnClickOutside);
                }
            };
            document.addEventListener('click', this.closePickerOnClickOutside);
        }, 0);
    }

    insertEmoji(emoji) {
        const input = document.getElementById('chat_message');
        input.value += emoji;
        input.focus();
        
        const picker = document.getElementById('emoji-picker');
        if (picker) picker.remove();
    }

    sendMessage() {
        const text = document.querySelector("#chat_message");
        if (text.value.length === 0) return;
        
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

        // Générer un messageId unique
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Envoyer aux autres participants avec l'ID
        this.peerService.broadcastMessage(message, this.myUsername, messageId);
        // Afficher localement
        this.createMessage(message, 'Me', messageId);
        text.value = '';
    }

    setMuteButton(isMuted) {
        let d = document.querySelector('.main__chat_window');
        d.scrollTop = d.scrollHeight;
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
