export class SocketService {
    constructor() {
        this.socket = io('/');
    }

    emit(event, data) {
        this.socket.emit(event, data);
    }

    on(event, callback) {
        this.socket.on(event, callback);
    }
}
