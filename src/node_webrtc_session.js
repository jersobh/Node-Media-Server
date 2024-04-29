const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require('wrtc');
const EventEmitter = require('events');
const Logger = require('./node_core_logger');
const NodeCoreUtils = require('./node_core_utils');

class NodeWebRTCSession extends EventEmitter {
  constructor(config, socket) {
    super();
    this.config = config;
    this.socket = socket;
    this.id = NodeCoreUtils.generateNewSessionID();
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.setupPeerConnection();
    this.bindSocketEvents();
  }

  setupPeerConnection() {
    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
      }
    };

    this.peerConnection.ontrack = event => {
      Logger.log(`[WebRTC] Track received: ${event.streams.length} streams`);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection.iceConnectionState === 'disconnected') {
        Logger.log('[WebRTC] Peer disconnected.');
        this.emit('disconnected');
        this.close();
      }
    };
  }

  bindSocketEvents() {
    this.socket.on('message', message => this.handleMessage(message));
    this.socket.on('close', () => this.close());
    this.socket.on('error', error => Logger.error(`[WebRTC] Error: ${error}`));
  }

  handleMessage(message) {
    const msg = JSON.parse(message);

    switch (msg.type) {
      case 'offer':
        this.handleOffer(msg.offer);
        break;
      case 'answer':
        this.handleAnswer(msg.answer);
        break;
      case 'candidate':
        this.handleCandidate(msg.candidate);
        break;
    }
  }

  handleOffer(offer) {
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => this.peerConnection.createAnswer())
      .then(answer => this.peerConnection.setLocalDescription(answer))
      .then(() => {
        this.socket.send(JSON.stringify({ type: 'answer', answer: this.peerConnection.localDescription }));
      })
      .catch(error => Logger.error(`[WebRTC] Offer Error: ${error}`));
  }

  handleAnswer(answer) {
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      .catch(error => Logger.error(`[WebRTC] Answer Error: ${error}`));
  }

  handleCandidate(candidate) {
    this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      .catch(error => Logger.error(`[WebRTC] Candidate Error: ${error}`));
  }

  close() {
    this.peerConnection.close();
    this.socket.close();
    this.emit('close', this.id);
    Logger.log(`[WebRTC] Session closed: ${this.id}`);
  }
}

module.exports = NodeWebRTCSession;
