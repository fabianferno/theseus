import WebSocket from "ws";
import { getOpenAIResponse } from "./Openapi";
import { callback } from "./nearCall";
import { getMessages } from "./utils/getMessages";
import { callOpenAI } from "./utils/openAi";
import { sendResponseToOracle } from "./utils/sendResponseOracle";
import { tools } from "./utils/tools";
import { sendFunctionResponse } from "./utils/sendFunctionResponse";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const socketUrl = "wss://ws-events.intear.tech/events-testnet/log_text";
const message = JSON.stringify({ account_id: "oracletest2.testnet" });

const app = express();
const server = createServer(app);
const loggerService = new Server(server);

// Handle incoming connections
loggerService.on("connection", (socket) => {
  console.log("a user connected");

  // Handle incoming messages
  socket.on("message", (data) => {
    console.log("message received:", data);

    // Broadcast the message to all connected clients
    realtimeLogger(data);
  });

  // Handle disconnections
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const __dirname = dirname(fileURLToPath(__filename));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "logger/client.html"));
});
// Start the server
server.listen(3000, () => {
  console.log("listening on PORT 3000");
});

function realtimeLogger(message: string) {
  loggerService.emit("message", message);
}

console.log("Attempting to connect to WebSocket...");

const nearStream = new WebSocket(socketUrl);

nearStream.on("open", () => {
  console.log("WebSocket connection established");
  console.log("Sending message:", message);
  nearStream.send(message);
});

nearStream.on("message", async (data) => {
  const parseddata = JSON.parse(data.toString()).log_text;
  realtimeLogger(JSON.stringify(parseddata));

  console.log("Received:", parseddata);
  const parsedData = JSON.parse(parseddata);

  // Accessing the `data` array from the log_text
  if (parsedData.data) {
    // get the prompt form reciver cpontract
    console.log("data" + parsedData.data);
    if (parsedData.type === "createOpenAiLlmCall") {
      const message = await getMessages(
        parsedData.data.promptCallbackID,
        parsedData.data.callbackAddress
      );
      console.log("messgae :" + message);
      console.log(`typeof message` + message);
      const openAIResponse = await callOpenAI(message, parsedData.data.config);
      console.log(openAIResponse);
      await sendResponseToOracle(
        parseInt(parsedData.data.promptId),
        parseInt(parsedData.data.promptCallbackID),
        openAIResponse.response,
        openAIResponse.error
      );
    } else if (parsedData.type == "createFunctionCall") {
      console.log(parsedData.data.functionType);
      console.log(parsedData.data.functionInput);
      const response = await tools(
        parsedData.data.functionType,
        parsedData.data.functionInput
      );

      await sendFunctionResponse(
        parseInt(parsedData.data.functionId),
        parseInt(parsedData.data.functionCallbackId),
        response.response,
        response.error
      );
    }
  }
});

nearStream.on("error", (error) => {
  console.error("WebSocket error:", error);
});

nearStream.on("close", (code, reason) => {
  console.log(`WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
});

console.log("Script started. Waiting for WebSocket events...");

// Keep the script running
process.on("SIGINT", () => {
  console.log("Received SIGINT. Closing WebSocket connection.");
  nearStream.close();
  process.exit(0);
});
