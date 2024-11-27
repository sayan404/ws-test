const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = 3005;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clientMap = new Map(); // To store client information
// Express routes
app.get("/", (req, res) => {
  res.send("WebSocket server is running!");
});

// WebSocket server logic
wss.on("connection", (socket) => {
  console.log("New WebSocket connection established.");

  socket.on("message", async (messageData) => {
    try {
      const { data, message, readKey, writeKey } = JSON.parse(messageData);
      console.log("Received message:", data, message, readKey, writeKey);

      if (readKey && writeKey) {
        const clientId = uuidv4();
        clientMap.set(clientId, { socket, readKey, writeKey });

        console.log("Registered client with keys:", {
          readKey,
          writeKey,
        });
        socket.send(
          JSON.stringify({ type: "registered", message: "Client registered." })
        );
      } else if (data && message === "Token") {
        const { writeKey, access_token } = data;

        // Find the client with the matching writeKey
        const targetClient = Array.from(clientMap.values()).find(
          (client) => client.writeKey === writeKey
        );

        if (targetClient) {
          targetClient.socket.send(JSON.stringify({ token: access_token }));
          socket.send(
            JSON.stringify({ type: "success", message: "Message routed." })
          );
          console.log("Message routed successfully.");
        } else {
          console.error("No matching client found for keys:", { writeKey });
          socket.send(
            JSON.stringify({
              type: "error",
              message: "No matching client found.",
            })
          );
        }
      }
    } catch (err) {
      console.error("Error processing message:", err);
      socket.send(
        JSON.stringify({ type: "error", message: "Invalid message format." })
      );
    }
  });

  socket.on("close", () => {
    console.log("WebSocket connection closed.");
    for (const [key, client] of clientMap.entries()) {
      if (client.socket === socket) {
        clientMap.delete(key);
        break;
      }
    }
  });
});

// Start the server
server.listen(port, async () => {
  // await connectMongoDB(); // Ensure MongoDB is connected before starting
  console.log(`Server running on http://localhost:${port}`);
  console.log(`WebSocket server running on ws://localhost:${port}`);
});
