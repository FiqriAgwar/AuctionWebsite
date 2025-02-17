import { Server } from "ws";
import type { NextApiRequest } from "next";
import type { NextApiResponse } from "next";

const wss = new Server({ noServer: true });

// In-memory bid history (in a real app, this would be stored in a database)
let bidHistory: { amount: number; timestamp: string; userEmail: string }[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers.upgrade !== "websocket") {
    res.status(400).end();
    return;
  }

  wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
    wss.emit("connection", ws, req);
  });

  wss.on("connection", (ws) => {
    // Send current bid history to the new client
    ws.send(JSON.stringify({ type: "bid_history", history: bidHistory }));

    ws.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (data.type === "place_bid") {
        const newBid = {
          amount: data.amount,
          timestamp: new Date().toISOString(),
          userEmail: data.userEmail,
        };
        bidHistory.unshift(newBid);
        bidHistory = bidHistory.slice(0, 10); // Keep only the 10 most recent bids

        // Broadcast the new bid to all clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "bid_update",
                amount: data.amount,
                isYourBid: client === ws,
                userEmail: data.userEmail,
                history: bidHistory,
              })
            );
          }
        });
      }
    });
  });

  res.status(101).end();
}
