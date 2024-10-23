"use client";

import PeerClientProvider, { usePeerClient } from "@/context/peer-client";

const HomeFn = () => {
  const { startCall, remoteVideoRef, localVideoRef } = usePeerClient();

  return (
    <div className="w-full h-full bg-red-700 flex">
      <div className="w-1/2 h-full flex items-center justify-center flex-col gap-y-2">
        <video
          ref={localVideoRef}
          className="w-1/2 h-1/2 bg-black rounded"
          autoPlay
        />
        <button
          className="py-3 px-4 bg-slate-400 rounded-md text-gray-700"
          onClick={startCall}
        >
          Iniciar chamada
        </button>
      </div>
      <div className="w-1/2 h-full flex items-center justify-center flex-col gap-y-2">
        <video
          ref={remoteVideoRef}
          className="w-1/2 h-1/2 bg-black rounded"
          autoPlay
          id="remote-video"
        />
        <button className="py-3 px-4 bg-slate-400 rounded-md text-gray-700 opacity-0">
          Iniciar chamada
        </button>
      </div>
    </div>
  );
};

const withPeerContext = (Component: React.FC) => (
  <PeerClientProvider>
    <Component />
  </PeerClientProvider>
);

export default function Home() {
  return withPeerContext(HomeFn);
}
