"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Heart, HeartOff } from "lucide-react";
import type { AuctionItemConfig, Bid } from "@/interface";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface AuctionItemProps {
  item: AuctionItemConfig;
  userId: string;
}

export default function AuctionItem({ item, userId }: AuctionItemProps) {
  const [currentBid, setCurrentBid] = useState(item.currentBid);
  const [userBid, setUserBid] = useState("");
  const [isUserHighestBidder, setIsUserHighestBidder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [latestBids, setLatestBids] = useState<Bid[]>([]);
  const [winnerUsername, setWinnerUsername] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchLatestBids = async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("amount, created_at, user_id")
        .eq("item_id", item.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching bid history:", error);
      } else {
        setLatestBids(
          data.map((bid) => ({
            amount: bid.amount,
            timestamp: bid.created_at,
            isUserBid: bid.user_id === userId,
          }))
        );
        setIsUserHighestBidder(data[0]?.user_id === userId);
      }
    };

    const fetchWinnerUsername = async () => {
      if (item.winnerId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", item.winnerId)
          .single();

        if (error) {
          console.error("Error fetching winner username:", error);
        } else {
          setWinnerUsername(data.username);
        }
      }
    };

    const checkUserLike = async () => {
      const { data, error } = await supabase
        .from("auction_likes")
        .select("id")
        .eq("user_id", userId)
        .eq("item_id", item.id)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          // PGRST116 is the error code for "no rows returned"
          console.error("Error checking user like:", error);
        }
      } else {
        setIsLiked(!!data);
      }
    };

    fetchLatestBids();
    fetchWinnerUsername();
    checkUserLike();

    // Set up real-time subscription for likes
    const likeChannel = supabase
      .channel(`item-likes-${item.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_likes",
          filter: `item_id=eq.${item.id}`,
        },
        (payload: RealtimePostgresChangesPayload<{ user_id: string }>) => {
          if (payload.eventType === "INSERT") {
            setLikeCount((prev) => prev + 1);
            if (payload.new && payload.new.user_id === userId) {
              setIsLiked(true);
            }
          } else if (payload.eventType === "DELETE") {
            setLikeCount((prev) => prev - 1);
            if (payload.old && payload.old.user_id === userId) {
              setIsLiked(false);
            }
          }
        }
      )
      .subscribe();

    const bidChannel = supabase
      .channel(`item-${item.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `item_id=eq.${item.id}`,
        },
        (payload) => {
          const newBid = payload.new;
          setLatestBids((prev) => [
            {
              amount: newBid.amount,
              timestamp: newBid.created_at,
              isUserBid: newBid.user_id === userId,
            },
            ...prev.slice(0, 4),
          ]);
          setCurrentBid(newBid.amount);
          setIsUserHighestBidder(newBid.user_id === userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bidChannel);
      supabase.removeChannel(likeChannel);
    };
  }, [item.id, item.winnerId, userId, supabase]);

  const handleBid = async () => {
    const bidAmount = Number(userBid);
    if (isNaN(bidAmount) || bidAmount <= currentBid) {
      alert("Your bid must be higher than the current bid.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc("place_bid", {
        p_user_id: userId,
        p_item_id: item.id,
        p_bid_amount: bidAmount,
      });

      if (error) {
        throw error;
      }

      setUserBid("");
      alert("Bid placed successfully!");
    } catch (error: any) {
      console.error("Error placing bid:", error);
      alert(`Failed to place bid: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    setIsLikeLoading(true);
    try {
      console.log(isLiked, userId, item.id);
      if (isLiked) {
        const { error } = await supabase
          .from("auction_likes")
          .delete()
          .eq("user_id", userId)
          .eq("item_id", item.id);

        if (error) throw error;
        setLikeCount((prev) => prev - 1);
        setIsLiked(false);
      } else {
        const { error } = await supabase
          .from("auction_likes")
          .insert({ user_id: userId, item_id: item.id });

        if (error) throw error;
        setLikeCount((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <Dialog>
        <DialogTrigger asChild>
          <div className="cursor-pointer">
            <Image
              src={item.imageUrl || "/placeholder.svg"}
              alt={item.name}
              width={300}
              height={300}
              className="w-full h-64 object-cover"
            />
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <VisuallyHidden>
            <DialogTitle>{item.name}</DialogTitle>
          </VisuallyHidden>
          <Image
            src={item.imageUrl || "/placeholder.svg"}
            alt={item.name}
            width={600}
            height={600}
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl font-semibold">{item.name}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLikeToggle}
              disabled={isLikeLoading}
              className={`${
                isLiked
                  ? "text-red-500 hover:text-red-600"
                  : "text-gray-500 hover:text-gray-600"
              }`}
            >
              {isLiked ? (
                <Heart className="w-5 h-5 fill-current" />
              ) : (
                <HeartOff className="w-5 h-5" />
              )}
              <span className="ml-1">{likeCount}</span>
            </Button>
          </div>
        </div>
        <p className="text-gray-600 mb-4">{item.description}</p>
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-bold">
            Current Bid: ₲{currentBid.toFixed(0)}
          </span>
          {item.onlineBid ? (
            isUserHighestBidder ? (
              <Badge variant="success">Winning</Badge>
            ) : (
              <Badge variant="secondary">Not Winning</Badge>
            )
          ) : (
            <Badge variant="destructive">Offline Auction</Badge>
          )}
        </div>
        {item.onlineBid ? (
          <div className="flex gap-2 mb-4">
            <Input
              type="number"
              value={userBid}
              onChange={(e) => setUserBid(e.target.value)}
              placeholder="Enter your bid"
              className="flex-grow"
              disabled={isLoading}
            />
            <Button onClick={handleBid} disabled={isLoading}>
              {isLoading ? "Bidding..." : "Bid"}
            </Button>
          </div>
        ) : item.winnerId ? (
          <div className="mb-4">
            <p className="font-semibold">Winner: {winnerUsername}</p>
            <p>Winning Bid: ₲{item.winnerBid?.toFixed(0)}</p>
          </div>
        ) : (
          <p className="mb-4 text-gray-600">
            This is an offline auction. The winner will be announced later.
          </p>
        )}
        <div>
          <h3 className="text-lg font-semibold mb-2">Latest Bids</h3>
          <ul className="space-y-1">
            {latestBids.map((bid, index) => (
              <li key={index} className="text-sm">
                ₲{bid.amount.toFixed(0)} -{" "}
                {new Date(bid.timestamp).toLocaleString()}
                {bid.isUserBid && " (Your Bid)"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
