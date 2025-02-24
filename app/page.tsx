/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { AuctionItemConfig } from "@/interface"
import Header from "@/components/Header"
import AuctionItem from "@/components/AuctionItem"

const supabase = createClientComponentClient()

async function getAuctionItems(): Promise<AuctionItemConfig[]> {
  const { data, error } = await supabase
    .from("auction_items")
    .select(`
      *,
      owner:profiles!auction_items_owner_fkey(realname, id),
      highest_bidder:profiles!auction_items_highest_bidder_fkey(realname, id)
    `)
    .order("order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })

  if (error) {
    console.error("Error fetching auction items:", error)
    return []
  }
  
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.image_url,
    currentBid: item.current_price,
    status: item.status,
    auctionEndTime: item.auction_end_time,
    ownerId: item.owner?.id,
    ownerRealname: item.owner?.realname || "Unknown",
    highestBidderId: item.highest_bidder?.id || null,
    highestBidderRealname: item.highest_bidder?.realname || "Unknown",
    winnerBid: item.current_price,
    order: item.order,
    likeCount: item.like_count || 0,
  }))
}

export default function Home() {
  const [auctionItems, setAuctionItems] = useState<AuctionItemConfig[]>([])
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const storedUser = localStorage.getItem("auction_user")

    if (!storedUser) {
      router.push("/login")
      return
    }

    setUser(JSON.parse(storedUser))

    // Fetch auction items
    getAuctionItems().then(setAuctionItems)

    // Set up real-time subscription for auction item updates
    const channel = supabase
      .channel("auction_item_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_items",
        },
        () => {
          getAuctionItems().then(setAuctionItems)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  if (!user) return <p>Loading...</p>

  const activeItems = auctionItems.filter((item) => item.status === "active")
  const upcomingItems = auctionItems.filter((item) => item.status === "upcoming")
  const finishedItems = auctionItems.filter((item) => item.status === "finished")

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Active Auctions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeItems.map((item) => (
              <AuctionItem key={item.id} item={item} userId={user.id} />
            ))}
          </div>
        </section>
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Upcoming Auctions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingItems.map((item) => (
              <AuctionItem key={item.id} item={item} userId={user.id} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-bold mb-4">Finished Auctions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finishedItems.map((item) => (
              <AuctionItem key={item.id} item={item} userId={user.id} />
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

