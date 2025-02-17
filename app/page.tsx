"use client"; // Mark as a Client Component

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuctionItem from "@/components/AuctionItem";
import BiddingSection from "@/components/BiddingSection";

async function getAuctionItem() {
  return {
    id: 1, // Ensure it's a number if your prop expects a number
    name: "Vintage Watch",
    description: "A beautiful vintage watch from the 1950s",
    imageUrl: "/placeholder.svg?height=300&width=300",
    currentBid: 100,
  };
}

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [item, setItem] = useState<Awaited<
    ReturnType<typeof getAuctionItem>
  > | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("auction_user");

    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUserId(storedUser);

    // Fetch the auction item
    getAuctionItem().then(setItem);
  }, []);

  if (!userId || !item) return <p>Loading...</p>; // Show a loading state while fetching

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Current Auction</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <AuctionItem item={item} />
        <BiddingSection
          itemId={item.id.toString()}
          initialBid={item.currentBid}
        />
      </div>
    </main>
  );
}
