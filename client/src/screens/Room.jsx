import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import "./RoomPage.css"; // Import the CSS file

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Detect if the user is on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const getMediaConstraints = () => {
    return {
      video: isMobile
        ? { width: { max: 640 }, height: { max: 480 } }
        : { width: 1280, height: 720 },
      audio: true,
    };
  };

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    myStream.getTracks().forEach(track => {
      peer.peer.addTrack(track, myStream);
    });
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleCallUser);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleCallUser);
    };
  }, [handleCallUser]);

  useEffect(() => {
    peer.peer.addEventListener("track", (ev) => {
      const [remoteStream] = ev.streams;
      console.log("GOT TRACKS!!", remoteStream);
      setRemoteStream(remoteStream);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
    };
  }, [socket, handleUserJoined, handleIncommingCall, handleCallAccepted]);

  return (
    <div className="room-container">
      <h1 className="room-title">Room Page</h1>
      <h4 className="status">{remoteSocketId ? "Connected" : "No one in room"}</h4>
      <div className="buttons">
        {myStream && <button onClick={sendStreams}>Send Stream</button>}
        {remoteSocketId && <button onClick={handleCallUser}>CALL</button>}
      </div>
      <div className="streams-container">
        {myStream && (
          <div className="stream">
            <h2>My Stream</h2>
            <ReactPlayer
              playing
              muted
              height="300px"
              width="500px"
              url={myStream}
            />
          </div>
        )}
        {remoteStream && (
          <div className="stream">
            <h2>Remote Stream</h2>
            <ReactPlayer
              playing
              muted
              height="300px"
              width="500px"
              url={remoteStream}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
