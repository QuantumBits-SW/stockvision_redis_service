import express from "express";
const router = express.Router();

const clients = [];

router.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  clients.push(res);

  req.on("close", () => {
    clients.splice(clients.indexOf(res), 1);
  });
});

// Broadcast Order Execution
export const sendSSE = (userId, message) => {
  clients.forEach((client) => {
    client.write(`data: ${JSON.stringify({ userId, message })}\n\n`);
  });
};

export default router;
