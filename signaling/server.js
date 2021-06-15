var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server);

const port = 3000;
console.log(`Starting on port: ${port}`);
server.listen(port);

app.get("/", function (req, res) {
  res.json({ healthy: true });
});

io.sockets.on("connection", function (socket) {
  console.log("Clinet connection!!. ID: " + socket.id);

  /*
   ** Receiv a message and reply a message
   ** Channel [message] to [message]
   */
  socket.on("message", function (message) {
    socket.to(message.room).emit("message", message);
  });

  /*
   ** Handle a create room and join room
   */
  socket.on("create or join", function (room) {
    // Get a information in the room
    var clientsInRoom = io.sockets.adapter.rooms[room];
    // Chack a infromation. How many user in the room
    var numClients = clientsInRoom
      ? Object.keys(clientsInRoom.sockets).length
      : 0;

    if (numClients === 0) {
      socket.join(room);
      io.to(socket.id).emit("created", room);
    } else if (numClients === 1) {
      io.sockets.in(room).emit("join", room);
      socket.join(room);
      socket.emit("joined", room, socket.id);
    } else {
      socket.emit("full", room);
    }
  });

  /*
   ** Handle a session. when user leaved the meeting
   */
  socket.on("bye", function () {
    console.log("received bye");
  });

  /*
   ** Handle a session. when user leaved the meeting
   */
  socket.on("disconnect", () => {
    console.log("Clinet disconnect!!. ID: " + socket.id);
  });
});
