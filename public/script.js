const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;

// Check if we need to connect to someone
const urlParams = new URLSearchParams(window.location.search);
const connectToId = urlParams.get('connectTo');
const myUsername = urlParams.get('username') || 'Anonymous';
const customId = urlParams.get('customId');

// Initialize Peer
// If customId is present, try to use it. Otherwise let PeerJS generate one.
const peer = customId ? new Peer(customId) : new Peer();

peer.on('error', err => {
  console.error(err);
  if (err.type === 'unavailable-id') {
    alert(`The Room Name "${customId}" is already taken. Please choose another one.`);
    window.location.href = '/';
  }
});

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream);

  // Answer incoming calls
  peer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
    
    call.on('close', () => {
      video.remove();
    });
  });

  // Handle incoming data connections (Chat & Mesh)
  peer.on('connection', conn => {
    setupDataConnection(conn);
  });

  // If we have an ID to connect to, call them
  if (connectToId) {
    // Wait for our ID to be ready
    if (myPeerId) {
      connectToPeer(connectToId, stream);
    } else {
      peer.on('open', () => {
        connectToPeer(connectToId, stream);
      });
    }
  }
});

peer.on('open', id => {
  myPeerId = id;
  console.log('My Peer ID is: ' + id);
});

// Removed global peer.on('connection') to ensure stream is ready

function connectToPeer(peerId, stream) {
  // Prevent duplicate connections
  if (dataConnections[peerId]) return;

  // 1. Call for Video
  const call = peer.call(peerId, stream);
  const video = document.createElement('video');
  
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
  });
  peers[peerId] = call;

  // 2. Connect for Chat
  const conn = peer.connect(peerId);
  setupDataConnection(conn);
}

function setupDataConnection(conn) {
  dataConnections[conn.peer] = conn;

  conn.on('open', () => {
    // Broadcast my known peers to this new connection (Mesh Networking)
    const knownPeers = Object.keys(dataConnections).filter(id => id !== conn.peer);
    if (knownPeers.length > 0) {
      conn.send({ type: 'peer-list', peers: knownPeers });
    }
  });

  conn.on('data', data => {
    // Handle received data
    if (data.type === 'chat') {
      createMessage(data.message, data.sender || 'User');
    }
    if (data.type === 'peer-list') {
      data.peers.forEach(otherPeerId => {
        if (otherPeerId !== myPeerId && !dataConnections[otherPeerId]) {
          connectToPeer(otherPeerId, myVideoStream);
        }
      });
    }
  });

  conn.on('close', () => {
    delete dataConnections[conn.peer];
    // Clean up video if it wasn't already
    if (peers[conn.peer]) {
        peers[conn.peer].close();
        delete peers[conn.peer];
    }
  });
  
  conn.on('error', () => {
    delete dataConnections[conn.peer];
  });
}

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
};

// Chat Logic
let text = document.querySelector("#chat_message");
let messages = document.querySelector(".messages");

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && text.value.length !== 0) {
    const message = text.value;
    
    // Send to all connected peers
    Object.values(dataConnections).forEach(conn => {
      if(conn.open) {
        conn.send({ type: 'chat', message: message, sender: myUsername });
      }
    });

    createMessage(message, 'Me');
    text.value = '';
  }
});

function createMessage(message, sender) {
  const li = document.createElement('li');
  
  // Détection des URLs d'images/GIFs
  const imageRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
  
  let content = message;
  if (imageRegex.test(message)) {
    content = message.replace(imageRegex, '<br><img src="$1" style="max-width: 200px; border-radius: 8px; margin-top: 5px;">');
  }
  
  li.innerHTML = `<b>${sender}</b><br/>${content}`;
  messages.append(li);
  scrollToBottom();
}

const scrollToBottom = () => {
  let d = document.querySelector('.main__chat_window');
  d.scrollTop = d.scrollHeight;
}

// Mute/Unmute
const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
}

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

// Stop/Play Video
const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
}

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}

const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}

let myVideoStream;
let myPeerId;
const peers = {}; // Keep track of calls
const dataConnections = {}; // Keep track of chat connections
