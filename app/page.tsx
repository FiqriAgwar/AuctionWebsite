import { redirect } from "next/navigation";
import AuctionItem from "@/components/AuctionItem";
import BiddingSection from "@/components/BiddingSection";
import { cookies } from "next/headers";

async function getAuctionItem() {
  // In a real application, this would fetch data from an API or database
  return {
    id: "1",
    name: "Vintage Watch",
    description: "A beautiful vintage watch from the 1950s",
    imageUrl: "/placeholder.svg?height=300&width=300",
    currentBid: 100,
  };
}

export default async function Home() {
  const cookieStore = cookies();
  const userCookie = (await cookieStore).get("user");

  if (!userCookie) {
    redirect("/login");
  }

  const item = await getAuctionItem();

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Current Auction</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <AuctionItem item={item} />
        <BiddingSection itemId={item.id} initialBid={item.currentBid} />
      </div>
    </main>
  );
}
