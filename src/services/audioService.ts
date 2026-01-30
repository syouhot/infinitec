import { websocketService } from './websocketService'

class AudioService {
  private localStream: MediaStream | null = null
  private peers: Map<string, RTCPeerConnection> = new Map()
  private userId: string | null = null
  private isConnected: boolean = false
  
  // STUN servers configuration
  private rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }

  initialize() {
    this.userId = websocketService.getUserId()
    websocketService.setAudioSignalCallback(this.handleSignal.bind(this))
    websocketService.setRoomUsersCallback(this.handleRoomUsers.bind(this))
  }

  // New method: Join audio room for receiving only (signaling ready)
  joinAudioRoom() {
    if (this.isConnected) return;
    
    this.isConnected = true;
    console.log('Joined audio room (recv only), waiting for signals...');
    // Broadcast join signal so others can initiate connection to us
    websocketService.sendAudioSignal(null, { type: 'join' });
  }

  // Modified: Enable microphone and add tracks to existing/new connections
  async enableMicrophone() {
    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      
      this.unmuteAudio(); // Ensure enabled

      // Add tracks to all existing peer connections
      this.peers.forEach((pc, userId) => {
        this.addLocalTracksToPC(pc);
        // Renegotiate
        this.renegotiate(pc, userId);
      });
      
      console.log('Microphone enabled');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  disableMicrophone() {
    this.muteAudio();
    console.log('Microphone disabled');
  }

  muteAudio() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => track.enabled = false)
    }
  }

  unmuteAudio() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => track.enabled = true)
    }
  }

  stopAudio() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
    
    // Close all peer connections
    this.peers.forEach(pc => pc.close())
    this.peers.clear()
    this.isConnected = false
    
    // Optionally send leave signal if we want strict cleanup
    websocketService.sendAudioSignal(null, { type: 'leave' })
  }

  private addLocalTracksToPC(pc: RTCPeerConnection) {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        // Check if track already added
        const senders = pc.getSenders();
        const alreadyAdded = senders.some(sender => sender.track === track);
        if (!alreadyAdded) {
             pc.addTrack(track, this.localStream!);
        }
      })
    }
  }

  private async renegotiate(pc: RTCPeerConnection, targetUserId: string) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        websocketService.sendAudioSignal(targetUserId, {
            type: 'offer',
            sdp: offer
        });
      } catch (e) {
          console.error('Error during renegotiation:', e);
      }
  }

  private async createPeerConnection(targetUserId: string, initiate: boolean) {
    if (this.peers.has(targetUserId)) {
        // If it exists, return it. The caller might be handling an update offer.
        return this.peers.get(targetUserId)!
    }

    const pc = new RTCPeerConnection(this.rtcConfig)
    this.peers.set(targetUserId, pc)

    // Add local tracks if available
    this.addLocalTracksToPC(pc);

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log(`Received remote track from ${targetUserId}`)
      const remoteAudio = new Audio()
      remoteAudio.srcObject = event.streams[0]
      remoteAudio.autoplay = true
      remoteAudio.play().catch(e => console.error('Error playing remote audio:', e))
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        websocketService.sendAudioSignal(targetUserId, {
          type: 'candidate',
          candidate: event.candidate
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
        console.log(`ICE state for ${targetUserId}: ${pc.iceConnectionState}`)
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            // Clean up?
        }
    }
    
    // Handle negotiation needed (for future track additions)
    pc.onnegotiationneeded = async () => {
        // We handle manual renegotiation in enableMicrophone, but standard WebRTC requires this.
        // However, simple manual handling is often more robust for basic use cases to avoid race conditions.
        // We'll skip auto-negotiation here to rely on manual triggers or 'initiate' flag.
    }

    if (initiate) {
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        websocketService.sendAudioSignal(targetUserId, {
          type: 'offer',
          sdp: offer
        })
      } catch (e) {
        console.error('Error creating offer:', e)
      }
    }

    return pc
  }

  private async handleSignal(data: { userId: string, signal: any }) {
    const { userId, signal } = data
    if (!this.isConnected) return // Ignore if not in audio session

    // console.log(`Received audio signal from ${userId}:`, signal.type)

    if (signal.type === 'join') {
      // Initiate connection to new user
      await this.createPeerConnection(userId, true)
    } else if (signal.type === 'leave') {
      if (this.peers.has(userId)) {
        this.peers.get(userId)?.close()
        this.peers.delete(userId)
      }
    } else if (signal.type === 'offer') {
      // Handle offer (initial or renegotiation)
      const pc = await this.createPeerConnection(userId, false)
      
      // Check for collision or state? standard webrtc logic.
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
          // If we are in weird state, might need rollback. But for now trust the flow.
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      websocketService.sendAudioSignal(userId, {
        type: 'answer',
        sdp: answer
      })
    } else if (signal.type === 'answer') {
      const pc = this.peers.get(userId)
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
      }
    } else if (signal.type === 'candidate') {
      const pc = this.peers.get(userId)
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
      }
    }
  }

  private handleRoomUsers(users: { userId: string, userName: string }[]) {
    // Check if any peer is no longer in the room
    const currentContextUserIds = users.map(u => u.userId)
    for (const [peerId, pc] of this.peers) {
        if (!currentContextUserIds.includes(peerId)) {
            console.log(`User ${peerId} left room, closing audio connection`)
            pc.close()
            this.peers.delete(peerId)
        }
    }
  }
}

export const audioService = new AudioService()
