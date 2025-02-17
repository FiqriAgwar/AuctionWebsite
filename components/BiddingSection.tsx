"use client";

import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BidHistory from "./BidHistory";
import { useAuth } from "@/hooks/useAuth";

interface Bid {
  amount: number;
  timestamp: string;
  isUserBid: boolean;
  userEmail: string;
}

interface BiddingSectionProps {
  itemId: string;
  initialBid: number;
}

export default function BiddingSection({
  itemId,
  initialBid,
}: BiddingSectionProps) {
  const [currentBid, setCurrentBid] = useState(initialBid);
  const [userBid, setUserBid] = useState("");
  const [isUserHighestBidder, setIsUserHighestBidder] = useState(false);
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const socket = useWebSocket(
    `ws://localhost:5000/api/auction?itemId=${itemId}`
  );
  const { user, profile, updateBalance } = useAuth();

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "bid_update") {
          setCurrentBid(data.amount);
          setIsUserHighestBidder(data.isYourBid);
          setBidHistory((prevHistory) => [
            {
              amount: data.amount,
              timestamp: new Date().toISOString(),
              isUserBid: data.isYourBid,
              userEmail: data.userEmail,
            },
            ...prevHistory.slice(0, 9), // Keep only the 10 most recent bids
          ]);
        } else if (data.type === "balance_update") {
          updateBalance(data.balance);
        }
      };
    }
  }, [socket, updateBalance]);

  const handleBid = () => {
    const bidAmount = Number.parseFloat(userBid);
    if (bidAmount > currentBid && profile && bidAmount <= profile.balance) {
      socket?.send(
        JSON.stringify({
          type: "place_bid",
          amount: bidAmount,
          userId: user?.id,
          itemId,
        })
      );
      setUserBid("");
    } else if (profile && bidAmount > profile.balance) {
      alert("Insufficient balance");
    } else {
      alert("Your bid must be higher than the current bid.");
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">
          Current Bid: ${currentBid.toFixed(2)}
        </h2>
        {isUserHighestBidder ? (
          <Badge variant="success" className="text-sm">
            Your Bid
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-sm">
            Not Your Bid
          </Badge>
        )}
      </div>
      <div className="mb-4">
        <p className="text-lg">
          Your Balance: ${profile?.balance.toFixed(2) || "0.00"}
        </p>
      </div>
      <div className="flex gap-4 mb-6">
        <Input
          type="number"
          value={userBid}
          onChange={(e) => setUserBid(e.target.value)}
          placeholder="Enter your bid"
          className="flex-grow"
        />
        <Button onClick={handleBid}>Place Bid</Button>
      </div>
      <BidHistory bids={bidHistory} />
    </div>
  );
}
