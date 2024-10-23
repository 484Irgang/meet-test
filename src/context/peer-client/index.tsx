import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type PeerClient = {
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  startCall: () => void;
};

type PeerSocketMessage = {
  type: "sdp-offer" | "sdp-answer" | "ice-candidate";
  data: RTCSessionDescriptionInit | RTCIceCandidate;
};

const peerConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const PeerClientContext = createContext<PeerClient>({} as PeerClient);

const PeerClientProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [peer, setPeer] = useState<RTCPeerConnection | null>(null);
  const [negotiating, setNegotiating] = useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const peerConnection = new RTCPeerConnection(peerConfig);
    setPeer(peerConnection);

    const socket = new WebSocket("ws://a70a-186-251-22-19.ngrok-free.app");
    socket.onopen = (event) => {
      console.info(`Connected to socket: ${event}`);
      setSocket(socket);
    };
    socket.onerror = (event) => {
      console.error(`Error on socket: ${event}`);
    };
  }, []);

  useEffect(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.onmessage = handleSocketEvent;
    }

    if (!!peer) {
      peer.onicecandidate = sendIceCandidate;
      peer.ontrack = ({ track, streams }) => {
        track.onunmute = () => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = streams[0];
          }
        };
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer, socket]);

  const sendIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    if (socket?.readyState === WebSocket.OPEN)
      return socket.send(
        JSON.stringify({
          type: "ice-candidate",
          data: event.candidate,
        })
      );
  };

  const handleSocketEvent = async (event: MessageEvent) => {
    const message: PeerSocketMessage = JSON.parse(event.data);

    if (!peer) return;

    if (message.type === "sdp-offer") {
      if (negotiating || peer.signalingState !== "stable") return;

      await peer.setRemoteDescription(
        message.data as RTCSessionDescriptionInit
      );

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      await peer.setLocalDescription();
      socket?.send(
        JSON.stringify({ type: "sdp-answer", data: peer.localDescription })
      );
    }

    if (message.type === "sdp-answer") {
      await peer.setRemoteDescription(
        message.data as RTCSessionDescriptionInit
      );
    }

    if (message.type === "ice-candidate") {
      peer.addIceCandidate(message.data as RTCIceCandidate);
    }
  };

  const startCall = async () => {
    if (!peer || socket?.readyState !== WebSocket.OPEN || negotiating) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    stream.getTracks().forEach((track) => {
      peer?.addTrack(track, stream);
    });

    if (!peer || socket?.readyState !== WebSocket.OPEN) return;
    setNegotiating(true);
    try {
      await peer.setLocalDescription();
      socket.send(
        JSON.stringify({ type: "sdp-offer", data: peer.localDescription })
      );
    } catch (e) {
      console.error(e);
    } finally {
      setNegotiating(false);
    }
  };

  return (
    <PeerClientContext.Provider
      value={{ localVideoRef, remoteVideoRef, startCall }}
    >
      {children}
    </PeerClientContext.Provider>
  );
};

const usePeerClient = () => useContext(PeerClientContext);

export default PeerClientProvider;
export { usePeerClient };
