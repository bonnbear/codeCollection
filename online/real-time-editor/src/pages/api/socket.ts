import { Server as HttpServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";

// Extend the NextApiResponse type to include our socket server instance
type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: HttpServer & {
      io: SocketIOServer;
    };
  };
};

let contentCache = "";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  // Check if the socket server is already running
  if (res.socket.server.io) {
    console.log("Socket is already running");
  } else {
    console.log("Socket is initializing");
    // Create a new Socket.io server and attach it to the existing HTTP server
    const io = new SocketIOServer(res.socket.server);
    res.socket.server.io = io;

    // Handle new client connections
    io.on("connection", (socket) => {
      console.log("A client connected");
      
      // Send the current content to the newly connected client
      socket.emit("contentUpdate", contentCache);

      // Listen for 'contentChange' events from a client
      socket.on("contentChange", (content: string) => {
        contentCache = content;
        // Broadcast the new content to all other clients
        socket.broadcast.emit("contentUpdate", content);
      });

      // Handle client disconnections
      socket.on("disconnect", () => {
        console.log("A client disconnected");
      });
    });
  }
  // End the API response
  res.end();
}