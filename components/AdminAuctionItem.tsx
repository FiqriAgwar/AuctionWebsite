"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import type { AuctionItemConfig } from "@/interface"

interface AdminAuctionItemProps {
  item: AuctionItemConfig
  isFirst: boolean
}

export default function AdminAuctionItem({ item, isFirst }: AdminAuctionItemProps) {
  const [status, setStatus] = useState(item.status)
  const [currentBid, setCurrentBid] = useState(item.currentBid || 0)
  const [highestBidderId, setHighestBidder] = useState<string | null>(item.highestBidderId || "")
  const [bidders, setBidders] = useState<{ id: string; realname: string }[]>([])
  const [timeLeft, setTimeLeft] = useState<string | null>("")
  const [pausedTime, setPausedTime] = useState<number | null>(0)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchBidders = async () => {
      const { data, error } = await supabase.from("profiles").select("id, realname")

      if (error) {
        console.error("Error fetching bidders:", error)
      } else {
        setBidders(data)
      }
    }

    fetchBidders()

    const timer = setInterval(() => {
      if (status === "active" && item.auctionEndTime) {
        const now = new Date()
        const end = new Date(item.auctionEndTime)
        const diff = end.getTime() - now.getTime()

        if (diff > 0) {
          const minutes = Math.floor(diff / 60000)
          const seconds = Math.floor((diff % 60000) / 1000)
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`)
        } else {
          setTimeLeft("Time's up!")
        }
      } else {
        setTimeLeft(null)
      }
    }, 1000)

    // Set up real-time subscription for this auction item
    const channel = supabase
      .channel(`auction_item_${item.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_items",
          filter: `id=eq.${item.id}`,
        },
        (payload) => {
          const updatedItem = payload.new as AuctionItemConfig
          setStatus(updatedItem.status)
          setCurrentBid(updatedItem.currentBid)
          setHighestBidder(updatedItem.highestBidderId)
        },
      )
      .subscribe()

    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [status, item.auctionEndTime, supabase, item.id])

  useEffect(() => {
    setHighestBidder(item.highestBidderId)
    setCurrentBid(item.currentBid)
  }, [item.highestBidderId, item.highestBidderRealname, item.currentBid])

  const handleStartBid = async () => {
    let endTime = new Date(Date.now() + 3 * 60 * 1000)
    if (pausedTime) {
      endTime = new Date(Date.now() + pausedTime)
    }

    const { error } = await supabase
      .from("auction_items")
      .update({ status: "active", auction_end_time: endTime.toISOString() })
      .eq("id", item.id)

    if (error) {
      console.error("Error starting bid:", error)
    } else {
      setStatus("active")
      setPausedTime(null)
    }
  }

  const handlePauseBid = async () => {
    const now = new Date()
    const end = new Date(item.auctionEndTime!)
    const remainingTime = end.getTime() - now.getTime()

    const { error } = await supabase
      .from("auction_items")
      .update({ status: "paused", auction_end_time: null })
      .eq("id", item.id)

    if (error) {
      console.error("Error pausing bid:", error)
    } else {
      setStatus("paused")
      setPausedTime(remainingTime)
    }
  }

  const handleStopBid = async () => {
    const { error } = await supabase
      .from("auction_items")
      .update({ status: "finished", auction_end_time: new Date().toISOString() })
      .eq("id", item.id)

    if (error) {
      console.error("Error stopping bid:", error)
      toast({
        title: "Error",
        description: "Failed to stop the bid. Please try again.",
        variant: "destructive",
      })
    } else {
      setStatus("finished")
      setPausedTime(null)
      toast({
        title: "Success",
        description: "Bid stopped successfully.",
        variant: "default",
      })
    }
  }

  const handleUpdateBid = async () => {
    if (highestBidderId === item.ownerId) {
      toast({
        title: "Warning",
        description: "The highest bidder cannot be the same as the owner.",
        variant: "destructive",
      })

      alert("The highest bidder cannot be the same as the owner.")
      return
    }

    const { error } = await supabase
      .from("auction_items")
      .update({ current_price: currentBid, highest_bidder: highestBidderId })
      .eq("id", item.id)

    if (error) {
      console.error("Error updating bid:", error)
      toast({
        title: "Error",
        description: "Failed to update bid. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Bid updated successfully.",
        variant: "default",
      })
    }
  }

  const handleReopenBid = async () => {
    const { error } = await supabase
      .from("auction_items")
      .update({ status: "upcoming", auction_end_time: null })
      .eq("id", item.id)

    if(error) console.error("Error in reopening the bid:", error);

    setStatus("upcoming");
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden mb-4 p-4">
      <div className="flex items-center mb-4">
        <Image
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.name}
          width={100}
          height={100}
          className="rounded-md mr-4"
        />
        <div>
          <h3 className="text-lg font-semibold">{item.name}</h3>
          <p className="text-gray-600">{item.description}</p>
          <p className="text-sm text-gray-500">
            <strong>Owner:</strong> {item.ownerRealname}
          </p>
          <p className="text-sm text-gray-500">
            <strong>Current Highest Bidder:</strong> {item.highestBidderRealname || "N/A"}
          </p>
          <p className="text-sm text-gray-500">
            <strong>Current Bid Amount:</strong> ₲{item.currentBid.toFixed(0)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Current Bid</label>
          <Input
            type="number"
            value={currentBid}
            onChange={(e) => setCurrentBid(Number(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Highest Bidder</label>
          <Select value={highestBidderId || ""} onValueChange={setHighestBidder}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue placeholder="Select a bidder" />
            </SelectTrigger>
            <SelectContent>
              {bidders.map((bidder) => (
                <SelectItem key={bidder.id} value={bidder.id}>
                  {bidder.realname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <p>
            <strong>Status:</strong> {status}
          </p>
          {timeLeft && (
            <p>
              <strong>Time Left:</strong> {timeLeft}
            </p>
          )}
        </div>
        <div>
          <Button onClick={handleUpdateBid} className="mr-2">
            Update Bid
          </Button>
          {isFirst && status !== "finished" && (
            <>
              {status === "upcoming" && <Button onClick={handleStartBid}>Start Bid</Button>}
              {status === "active" && (
                <>
                  <Button onClick={handlePauseBid} className="mr-2">
                    Pause Bid
                  </Button>
                  <Button onClick={handleStopBid}>Stop Bid</Button>
                </>
              )}
              {status === "paused" && <Button onClick={handleStartBid}>Resume Bid</Button>}
            </>
          )}
          {status === "finished" && (
            <>
              <Button onClick={handleReopenBid} className="mr-2">
                Reopen Bid
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

