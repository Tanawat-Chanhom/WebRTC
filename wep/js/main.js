/*
 ** State check for who is starter or receiver
 */
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;

/*
 ** Normal state or variable
 */
var peerConnection;
var localStream; // Stream from user media [Onwer]
var localScreenStream; // Stream from user media [Other]

/*
 ** Get room name from user
 */
room = prompt("Enter room name:");

/*
 ** Owner Media Variable
 */
var localVideo = document.querySelector("#localVideo"); // Your stream data
var remoteVideo = document.querySelector("#remoteVideo"); // from Other side

/*
 ** Other Media Variable
 */
var localScreen = document.querySelector("#localScreen"); // Your stream data
var remoteScreen = document.querySelector("#remoteScreen"); // from Other side

/*
 **
 **
 **  Path of Get user media
 **
 **
 */
navigator.mediaDevices
  .getDisplayMedia({
    audio: false,
    video: true,
  })
  .then(gotScreenStream)
  .catch(function (e) {
    alert("getDisplayMedia() error_1: " + e.name);
  });

function gotScreenStream(stream) {
  console.log("Adding screen local stream.");
  localScreenStream = stream;
  localScreen.srcObject = stream;
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then(gotStream)
    .catch(function (e) {
      alert("getUserMedia() error_2: " + e.name);
    });
}

function gotStream(stream) {
  console.log("Adding local stream.");
  localStream = stream;
  localVideo.srcObject = stream;
  if (room !== "") {
    socket.emit("create or join", room);
    console.log("Attempted to create or  join room", room);
  }
}

/*
 **
 **
 **  Path of Socket IO
 **
 **
 */
var socket = io("http://localhost:3000");

/*
 ** [For Starter]
 */
socket.on("created", function (room) {
  console.log("Created room " + room);
  isInitiator = true;
});

/*
 ** [For Other: Check to room is full or not]
 */
socket.on("full", function (room) {
  alert("Room " + room + " is full");
});

/*
 ** [For Starter]
 */
socket.on("join", function (room) {
  console.log("Another peer made a request to join room " + room);
  console.log("This peer is the initiator of room " + room + "!");
  isChannelReady = true;
  startConnection();
});

socket.on("joined", function (room) {
  console.log("joined: " + room);
  isChannelReady = true;
});

/*
 ** Listen the server. when user send a message to the server
 */
socket.on("message", function (message) {
  switch (message.type) {
    /*
     ** [For Receiver]
     */
    case "offer":
      console.log("Client received a offer.");
      if (!isInitiator && !isStarted) {
        startConnection();
      }
      peerConnection.setRemoteDescription(
        new RTCSessionDescription(message.sessionDescription)
      );
      createAnswer();
      break;

    /*
     ** [For Starter]
     */
    case "answer":
      console.log("Client received a answer.");
      if (isStarted) {
        peerConnection.setRemoteDescription(
          new RTCSessionDescription(message.sessionDescription)
        );
      }
      break;

    /*
     ** [For Receiver and Starter]
     */
    case "candidate":
      console.log("Client received a candidate.");
      if (isStarted) {
        var candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        });
        peerConnection.addIceCandidate(candidate);
      }
      break;
    case "bye":
      if (isStarted) {
        // handleRemoteHangup();
      }
      break;
    default:
      break;
  }
});

function sendMessage(message) {
  // console.log("Client sending message: ", message);
  socket.emit("message", message);
}

/*
 **
 **
 **  Path of Peer Connection
 **
 **
 */
async function startConnection() {
  console.log(">>>>>> startConnection");
  if (isStarted === false && isChannelReady) {
    createPeerConnection();

    if (typeof localScreenStream !== "undefined") {
      localScreenStream.getTracks().forEach(function (track) {
        console.log("Track Screen");
        peerConnection.addTrack(track, localScreenStream);
      });
    }

    if (typeof localStream !== "undefined") {
      localStream.getTracks().forEach(function (track) {
        console.log("Track Video");
        peerConnection.addTrack(track, localStream);
      });
    }

    // Change state the meeting is started
    isStarted = true;

    // Check for you are started or not?
    if (isInitiator) {
      createOffer();
    }
  }
}

// Or Create Offer
function createOffer() {
  console.log("Sending offer to peer");
  peerConnection.createOffer(setLocalAndSendMessage, (err) => {
    console.log(`Error from create offer: ${err}`);
  });
}

function createAnswer() {
  console.log("Sending answer to peer.");
  peerConnection.createAnswer().then(setLocalAndSendMessage, (err) => {
    console.log(`Error from create answer: ${err}`);
  });
}

function createPeerConnection() {
  try {
    peerConnection = new RTCPeerConnection();
    peerConnection.onicecandidate = handleIceCandidate;
    peerConnection.ontrack = handleRemoteTrackAdded;
    console.log("Created RTCPeerConnnection");
  } catch (e) {
    console.log("Failed to create PeerConnection, exception: " + e.message);
    alert("Cannot create RTCPeerConnection object.");
    return;
  }
}

function handleIceCandidate(event) {
  if (event.candidate) {
    sendMessage({
      room: room,
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
    });
  } else {
    console.log("End of candidates.");
  }
}

var mediaStreamIds = [];
function handleRemoteTrackAdded(event) {
  console.log("Remote track added.");
  if (event.streams && event.streams[0]) {
    let stream = event.streams[0];
    let id = stream.id;
    if (!mediaStreamIds.includes(id)) {
      if (mediaStreamIds.length == 0) {
        remoteScreen.srcObject = stream;
      } else {
        remoteVideo.srcObject = stream;
      }
      mediaStreamIds.push(id);
    }
  }
}

function setLocalAndSendMessage(sessionDescription) {
  peerConnection.setLocalDescription(sessionDescription);
  console.log("setLocalAndSendMessage sending message", sessionDescription);
  sendMessage({
    room: room,
    type: sessionDescription.type,
    sessionDescription: sessionDescription,
  });
}

/*
 **
 **
 **  Path of Other Functions
 **
 **
 */

// function myAlert(message) {
//   setTimeout(() => {
//     alert(message);
//   }, 1000);
// }
