"use client";

import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

let socket: Socket;

export default function Home() {
  const [content, setContent] = useState("");

  useEffect(() => {
    // Initialize the socket connection on the client side
    // We will create this server in the next steps
    fetch('/api/socket').finally(() => {
      socket = io();

      socket.on("connect", () => {
        console.log("Connected to the server");
      });

      // Listen for 'contentUpdate' event from the server
      socket.on("contentUpdate", (newContent: string) => {
        setContent(newContent);
      });

      // Clean up the socket connection when the component unmounts
      return () => {
        socket.disconnect();
      };
    })
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    // Emit 'contentChange' event to the server
    socket.emit("contentChange", newContent);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Real-time Online Editor</h1>
      <textarea
        className="w-full h-96 p-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        value={content}
        onChange={handleContentChange}
        placeholder="Start typing here..."
      />
    </main>
  );
}
