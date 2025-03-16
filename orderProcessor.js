export const processOrders = async (symbol, lastPrice) => {
  const orderIds = await redis.sMembers(`symbolOrders:${symbol}`); // Get all orders for this stock

  for (const orderId of orderIds) {
    const orderData = await redis.get(`order:*:${orderId}`);
    if (!orderData) continue;

    const order = JSON.parse(orderData);
    const userId = order.userId;

    let shouldExecute = false;
    let apiEndpoint = `${process.env.BACKEND_API}`;

    if (order.orderType === "limit" && lastPrice >= order.price) {
      shouldExecute = true;
      apiEndpoint += '/orders/buy' ; // Limit order is a BUY
    }

    if ((order.orderType === "stop-loss" || order.orderType === "oco") && lastPrice <= order.price) {
      shouldExecute = true;
      apiEndpoint = '/orders/sell'; // Stop-Loss & OCO orders are SELL
    }

    if (shouldExecute) {
      console.log(`Executing ${order.orderType} Order for ${symbol} at ${order.price}`);

      // Execute order in backend
      await axios.post(apiEndpoint, order);
      await redis.del(`order:${userId}:${orderId}`);
      await redis.sRem(`symbolOrders:${symbol}`, orderId);

      if (order.orderType === "oco" && order.linkedOrderId) {
        console.log(`Canceling linked OCO order: ${order.linkedOrderId}`);
        await redis.del(`order:${userId}:${order.linkedOrderId}`);
        await redis.sRem(`symbolOrders:${symbol}`, order.linkedOrderId);

        sendSSE(order.userId, `OCO Order executed for ${symbol} at ${order.price}, linked order canceled.`);
      } else {
        sendSSE(order.userId, `${order.orderType} order executed for ${symbol} at ${order.price}`);
      }
    }
  }
};
