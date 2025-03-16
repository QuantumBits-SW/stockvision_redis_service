import express from "express";
import cors from "cors";
import orderRoutes from "./routes/orders.js";
import sse from "./sse.js";
import "./websocket.js"; // Start WebSocket listener

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/orders", orderRoutes);

// SSE Route
app.use("/api/events", sse);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Trading Service running on port ${PORT}`));
