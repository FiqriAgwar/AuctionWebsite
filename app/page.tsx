"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuctionItem from "@/components/AuctionItem";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { AuctionItemConfig } from "@/interface";
import Header from "@/components/Header";

const supabase = createClientComponentClient();

async function getAuctionItems(): Promise<AuctionItemConfig[]> {
  const { data, error } = await supabase
    .from("auction_items")
    .select(
      "id, name, description, current_price, image_url, online_bid, sold_to, like_count"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching auction items:", error);
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.image_url,
    currentBid: item.current_price,
    onlineBid: item.online_bid,
    winnerId: item.sold_to,
    winnerBid: item.current_price,
    likeCount: item.like_count,
  }));
}

export default function Home() {
  const [onlineItems, setOnlineItems] = useState<AuctionItemConfig[]>([]);
  const [offlineItems, setOfflineItems] = useState<AuctionItemConfig[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("auction_user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(storedUser));

    // Fetch all auction items
    getAuctionItems().then((items) => {
      setOnlineItems(items.filter((item) => item.onlineBid));
      setOfflineItems(items.filter((item) => !item.onlineBid));
    });

    // Set up real-time subscription for auction item updates
    const channel = supabase
      .channel("auction_item_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auction_items",
        },
        (payload) => {
          const updatedItem = payload.new as AuctionItemConfig;
          if (updatedItem.onlineBid) {
            setOnlineItems((prevItems) =>
              prevItems.map((item) =>
                item.id === updatedItem.id ? updatedItem : item
              )
            );
          } else {
            setOfflineItems((prevItems) =>
              prevItems.map((item) =>
                item.id === updatedItem.id ? updatedItem : item
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (!user) return <p>Loading...</p>;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Offline Auctions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {offlineItems.map((item) => (
              <AuctionItem key={item.id} item={item} userId={user.id} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-bold mb-4">Online Auctions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {onlineItems.map((item) => (
              <AuctionItem key={item.id} item={item} userId={user.id} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
