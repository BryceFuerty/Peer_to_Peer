export class HomeController {
    constructor() {
        this.socket = io('/');
        this.roomsContainer = document.getElementById('rooms-container');
        this.usernameInput = document.getElementById('usernameInput');
        this.roomNameInput = document.getElementById('roomNameInput');
        this.peerIdInput = document.getElementById('peerIdInput');

        this.init();
    }

    init() {
        this.socket.on('update-room-list', (rooms) => this.updateRoomList(rooms));
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelector('.btn-create').onclick = () => this.createRoom();
        document.querySelector('.btn-join').onclick = () => this.joinByPeer();
    }

    updateRoomList(rooms) {
        this.roomsContainer.innerHTML = '';
        if (rooms.length === 0) {
            this.roomsContainer.innerHTML = '<div style="color: #666; font-style: italic;">No active rooms</div>';
            return;
        }
        
        rooms.forEach(room => {
            const div = document.createElement('div');
            div.className = 'room-item';
            
            const span = document.createElement('span');
            span.textContent = room.name;
            
            const button = document.createElement('button');
            button.className = 'btn-join';
            button.textContent = 'Join';
            button.onclick = () => this.joinRoom(room.name);
            
            div.appendChild(span);
            div.appendChild(button);
            
            this.roomsContainer.appendChild(div);
        });
    }

    joinRoom(roomName) {
        const username = this.usernameInput.value.trim();
        if (!username) return alert('Please enter a username first');
        window.location.href = `/room?connectTo=${roomName}&username=${encodeURIComponent(username)}`;
    }

    createRoom() {
        const username = this.usernameInput.value.trim();
        const roomName = this.roomNameInput.value.trim();
        
        if (!username) return alert('Please enter a username');
        
        let url = `/room?username=${encodeURIComponent(username)}`;
        if (roomName) {
            url += `&customId=${encodeURIComponent(roomName)}`;
        }
        
        window.location.href = url;
    }

    joinByPeer() {
        const username = this.usernameInput.value.trim();
        const peerId = this.peerIdInput.value.trim();
        
        if (!username) return alert('Please enter a username');
        if (!peerId) return alert('Please enter a Peer ID');
        
        window.location.href = `/room?connectTo=${peerId}&username=${encodeURIComponent(username)}`;
    }
}
