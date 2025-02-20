/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { AuctionItemConfig } from "@/interface"
import Header from "@/components/Header"
import AdminAuctionItem from "@/components/AdminAuctionItem"

const supabase = createClientComponentClient()

async function getAuctionItems(): Promise<AuctionItemConfig[]> {
  const { data, error } = await supabase
    .from("auction_items")
    .select("*, owner:profiles!auction_items_owner_fkey(realname, id), highest_bidder:profiles!auction_items_highest_bidder_fkey(realname, id)")
    .order("order", { ascending: true })

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

export default function AdminPage() {
  const [ongoingAuctions, setOngoingAuctions] = useState<AuctionItemConfig[]>([])
  const [finishedAuctions, setFinishedAuctions] = useState<AuctionItemConfig[]>([])
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const storedUser = localStorage.getItem("auction_user")

    if (!storedUser) {
      router.push("/login")
      return
    }

    const parsedUser = JSON.parse(storedUser)
    setUser(parsedUser)

    if (!parsedUser.is_admin) {
      router.push("/")
      return
    }

    // Fetch auction items
    getAuctionItems().then((items) => {
      setOngoingAuctions(items.filter((item) => item.status !== "finished"))
      setFinishedAuctions(items.filter((item) => item.status === "finished"))
    })

    // Set up real-time subscription for auction item updates
    const channel = supabase
      .channel("admin_auction_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_items",
        },
        () => {
          getAuctionItems().then((items) => {
            setOngoingAuctions(items.filter((item) => item.status !== "finished"))
            setFinishedAuctions(items.filter((item) => item.status === "finished"))
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  if (!user || !user.is_admin) return null

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Ongoing Auctions</h2>
          {ongoingAuctions.map((item, index) => (
            <AdminAuctionItem key={item.id} item={item} isFirst={index === 0} />
          ))}
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-4">Finished Auctions</h2>
          {finishedAuctions.map((item) => (
            <AdminAuctionItem key={item.id} item={item} isFirst={false} />
          ))}
        </section>
      </main>
    </>
  )
}

