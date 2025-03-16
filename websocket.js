import WebSocket from "ws";
import dotenv from "dotenv";
import { processOrders } from "./orderProcessor.js";

dotenv.config();

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);

ws.on("open", () => console.log("Connected to Finnhub WebSocket"));

ws.on("message", (data) => {
  const message = JSON.parse(data);

  if (message.type === "trade") {
    message.data.forEach((trade) => {
      const { s: symbol, p: price } = trade;
      processOrders(symbol, price); // Process matching orders
    });
  }
});

ws.on("error", (err) => console.error("WebSocket Error:", err));

export const subscribeToStock = (symbol) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "subscribe", symbol }));
    console.log(`Subscribed to ${symbol}`);
  } else {
    console.error("WebSocket not ready yet.");
  }
};
