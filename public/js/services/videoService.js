export class VideoService {
    constructor(videoGridId) {
        this.videoGrid = document.getElementById(videoGridId);
        this.myVideo = document.createElement('video');
        this.myVideo.muted = true;
        this.myVideoStream = null;
    }

    async getVideoStream() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            this.myVideoStream = stream;
            this.addVideoStream(this.myVideo, stream);
            return stream;
        } catch (error) {
            console.error('Error accessing media devices.', error);
            throw error;
        }
    }

    addVideoStream(video, stream) {
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', () => {
            video.play();
        });
        this.videoGrid.append(video);
    }

    muteUnmute() {
        if (!this.myVideoStream) return false;
        const enabled = this.myVideoStream.getAudioTracks()[0].enabled;
        if (enabled) {
            this.myVideoStream.getAudioTracks()[0].enabled = false;
            return true;
        } else {
            this.myVideoStream.getAudioTracks()[0].enabled = true;
            return false;
        }
    }

    playStop() {
        if (!this.myVideoStream) return false;
        const enabled = this.myVideoStream.getVideoTracks()[0].enabled;
        if (enabled) {
            this.myVideoStream.getVideoTracks()[0].enabled = false;
            return true; 
        } else {
            this.myVideoStream.getVideoTracks()[0].enabled = true;
            return false;
        }
    }
}
