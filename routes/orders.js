import express from "express";
import redis from "../redisClient.js";
import { subscribeToStock } from "../websocket.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

router.post("/", async (req, res) => {
  const { symbol, orderType, limit, stop, quantity, userId } = req.body;
  
  if (orderType === "oco") {
    const limitOrderId = uuidv4();
    const stopOrderId = uuidv4();

    const limitOrder = {
      orderId: limitOrderId,
      symbol,
      orderType: "limit",
      price: limit,
      quantity,
      userId,
      linkedOrderId: stopOrderId
    };

    const stopOrder = {
      orderId: stopOrderId,
      symbol,
      orderType: "stop-loss",
      price: stop,
      quantity,
      userId,
      linkedOrderId: limitOrderId
    };

    // Store both orders by userId
    await redis.set(`order:${userId}:${limitOrderId}`, JSON.stringify(limitOrder));
    await redis.set(`order:${userId}:${stopOrderId}`, JSON.stringify(stopOrder));

    // Store order IDs under `symbolOrders`
    await redis.sAdd(`symbolOrders:${symbol}`, limitOrderId, stopOrderId);

    subscribeToStock(symbol);

    res.json({
      message: `Stored OCO orders for ${symbol}: Limit at ${limit}, Stop-Loss at ${stop}`,
      orders: [limitOrderId, stopOrderId]
    });
  } else {
    const orderId = uuidv4();
    const order = { orderId, symbol, orderType, price: orderType=="stop-loss" ? stop : limit, quantity, userId };

    await redis.set(`order:${userId}:${orderId}`, JSON.stringify(order));
    await redis.sAdd(`symbolOrders:${symbol}`, orderId);

    subscribeToStock(symbol);

    res.json({ message: `Stored ${orderType} order for ${symbol} at ${limit}`, orderId });
  }
});

router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    const keys = await redis.keys(`order:${userId}:*`);
    
    if (keys.length === 0) {
      return res.status(404).json({ message: "No active orders for this user." });
    }

    const orders = [];
    for (const key of keys) {
      const orderData = await redis.get(key);
      if (orderData) orders.push(JSON.parse(orderData));
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});


export default router;
