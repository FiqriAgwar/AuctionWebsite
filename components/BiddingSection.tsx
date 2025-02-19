"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BidHistory from "./BidHistory";
import type { Bid, AuctionItemConfig } from "@/interface";

interface BiddingSectionProps {
  itemId: string;
  initialBid: number;
}

interface StoredUser {
  id: string;
  username: string;
  balance: number;
}

export default function BiddingSection({
  itemId,
  initialBid,
}: BiddingSectionProps) {
  const [currentItem, setCurrentItem] = useState<AuctionItemConfig | null>(
    null
  );
  const [currentBid, setCurrentBid] = useState(initialBid);
  const [userBid, setUserBid] = useState("");
  const [isUserHighestBidder, setIsUserHighestBidder] = useState(false);
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem("auction_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const fetchCurrentItem = async () => {
      const { data, error } = await supabase
        .from("auction_items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (error) {
        console.error("Error fetching current item:", error);
      } else {
        setCurrentItem(data);
        setCurrentBid(data.current_price);
      }
    };

    const fetchBidHistory = async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("amount, created_at, user_id")
        .eq("item_id", itemId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching bid history:", error);
      } else if (user) {
        setBidHistory(
          data.map((bid) => ({
            amount: bid.amount,
            timestamp: bid.created_at,
            isUserBid: bid.user_id === user.id,
          }))
        );
      }
    };

    if (user) {
      fetchCurrentItem();
      fetchBidHistory();

      // Set up real-time subscription
      const channel = supabase
        .channel("auction_updates")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "auction_items",
            filter: `id=eq.${itemId}`,
          },
          (payload) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setCurrentItem(payload.new as any);
            setCurrentBid(payload.new.current_price);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bids",
            filter: `item_id=eq.${itemId}`,
          },
          (payload) => {
            const newBid = payload.new;
            setBidHistory((prev) => [
              {
                amount: newBid.amount,
                timestamp: newBid.created_at,
                isUserBid: newBid.user_id === user.id,
              },
              ...prev.slice(0, 9),
            ]);
            setIsUserHighestBidder(newBid.user_id === user.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [itemId, user, supabase]);

  const handleBid = async () => {
    if (!currentItem || !user) {
      alert("You need to be logged in to bid.");
      return;
    }

    const bidAmount = Number(userBid);
    if (isNaN(bidAmount) || bidAmount <= currentBid) {
      alert("Your bid must be higher than the current bid.");
      return;
    }

    setIsLoading(true);

    try {
      const {  error } = await supabase.rpc("place_bid", {
        p_user_id: user.id,
        p_item_id: itemId,
        p_bid_amount: bidAmount,
      });

      if (error) {
        throw error;
      }

      setUserBid("");
      alert("Bid placed successfully!");
      // Refresh the current item and bid history
      const { data: updatedItem } = await supabase
        .from("auction_items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (updatedItem) {
        setCurrentItem(updatedItem);
        setCurrentBid(updatedItem.current_price);
      }

      const { data: updatedBids } = await supabase
        .from("bids")
        .select("amount, created_at, user_id")
        .eq("item_id", itemId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (updatedBids) {
        setBidHistory(
          updatedBids.map((bid) => ({
            amount: bid.amount,
            timestamp: bid.created_at,
            isUserBid: bid.user_id === user.id,
          }))
        );
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error placing bid:", error);
      alert(`Failed to place bid: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentItem) {
    return (
      <p className="text-center text-gray-500">
        No active auction at the moment.
      </p>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">
          Current Bid: ₲{currentBid.toFixed(0)}
        </h3>
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
      <div className="flex gap-4 mb-6">
        <Input
          type="number"
          value={userBid}
          onChange={(e) => setUserBid(e.target.value)}
          placeholder="Enter your bid"
          className="flex-grow"
          disabled={isLoading}
        />
        <Button onClick={handleBid} disabled={isLoading}>
          {isLoading ? "Placing Bid..." : "Place Bid"}
        </Button>
      </div>
      <BidHistory bids={bidHistory} />
    </div>
  );
}
