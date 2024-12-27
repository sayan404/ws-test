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
app.get("/status", (req, res) => {
  res.send("server is running!").status(200);
});

console.log(
  "WebSocket server running on wss://websocket-testing-lbbz.onrender.com"
);

wss.on("connection", (socket) => {
  console.log("New connection established.");

  // Handle incoming messages
  socket.on("message", async (messageData) => {
    try {
      const { data, message, readKey, writeKey } = JSON.parse(messageData);
      console.log("Received message:", data, message, readKey, writeKey);

      if (readKey && writeKey) {
        const clientId = uuidv4();
        // Store client information
        clientMap.set(clientId, { socket, readKey, writeKey });

        console.log(` registered with keys:`, {
          readKey,
          writeKey,
        });
        // socket.send(JSON.stringify({ type: "registered", clientId }));
      } else if (data && message === "Token") {
        const { writeKey, access_token } = data;
        // const clientId = uuidv4();

        // Find the corresponding client with matching keys
        const targetClient = Array.from(clientMap.values()).find((client) => {
          console.log(
            "client : ",
            client.writeKey,
            client.writeKey === writeKey
          );
          return client.writeKey === writeKey;
        });
        console.log("targetClient : ", targetClient);

        if (targetClient) {
          // Forward message to the target client
          targetClient.socket.send(JSON.stringify({ result: access_token }));
          socket.send(
            JSON.stringify({ type: "success", message: "Message routed." })
          );
          console.log("Message routed successfully.");
        } else {
          console.error("No matching client found for keys:", {
            readKey,
            writeKey,
          });
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

  // Handle socket closure
  socket.on("close", () => {
    console.log("Connection closed.");
    // Remove client from the map
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
