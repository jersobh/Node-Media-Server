const WebSocket = require('ws');
const NodeWebRTCSession = require('./node_webrtc_session');
const Logger = require('./node_core_logger');

class NodeWebRTCServer {
    constructor(port, config) {
        this.port = port;
        this.config = config;  // Configuration might include ICE server details, etc.
        this.wss = new WebSocket.Server({ port: this.port });
        Logger.log(`WebRTC server started on port ${this.port}`);

        this.wss.on('connection', ws => {
            Logger.log('New WebRTC connection established');
            const webrtcSession = new NodeWebRTCSession(this.config, ws);

            webrtcSession.on('disconnected', () => {
                Logger.log('WebRTC peer disconnected');
            });

            webrtcSession.on('close', (sessionId) => {
                Logger.log(`WebRTC session closed: ${sessionId}`);
            });

            ws.on('error', error => {
                Logger.error(`WebSocket error: ${error}`);
                webrtcSession.close();  // Ensure clean closure of sessions on errors
            });
        });
    }
}

module.exports = NodeWebRTCServer;
