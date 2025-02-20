"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import type { AuctionItemConfig } from "@/interface"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface AuctionItemProps {
  item: AuctionItemConfig
  userId: string
}

export default function AuctionItem({ item, userId }: AuctionItemProps) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null)
  const [likeCount, setLikeCount] = useState(item.likeCount)
  const [isLiked, setIsLiked] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const timer = setInterval(() => {
      if (item.status === "active" && item.auctionEndTime) {
        const now = new Date()
        const end = new Date(item.auctionEndTime)
        const diff = end.getTime() - now.getTime()

        if (diff > 0) {
          const minutes = Math.floor(diff / 60000)
          const seconds = Math.floor((diff % 60000) / 1000)
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`)
        } else {
          setTimeLeft("Waiting for auctioneer...")
        }
      } else {
        setTimeLeft(null)
      }
    }, 1000)

    const checkUserLike = async () => {
      const { data, error } = await supabase
        .from("auction_likes")
        .select("id")
        .eq("user_id", userId)
        .eq("item_id", item.id)
        .maybeSingle()

      if (error) {
        if (error.code !== "PGRST116") {
          console.error("Error checking user like:", error)
        }
        else{
          console.warn("No like found by this user towards: ", item.id);
        }
      } else {
        setIsLiked(!!data)
      }
    }

    checkUserLike()

    return () => clearInterval(timer)
  }, [item.status, item.auctionEndTime, item.id, userId, supabase])

  const handleLikeToggle = async () => {
    try {
      if (isLiked) {
        const { error } = await supabase.from("auction_likes").delete().eq("user_id", userId).eq("item_id", item.id)

        if (error) throw error
        setLikeCount((prev) => prev - 1)
        setIsLiked(false)
      } else {
        const { error } = await supabase.from("auction_likes").insert({ user_id: userId, item_id: item.id })

        if (error) throw error
        setLikeCount((prev) => prev + 1)
        setIsLiked(true)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <Dialog>
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Hidden Title for Screen Readers</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
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
        <DialogContent className="sm:max-w-[425px]">
          <div className="w-full h-[400px] relative">
            <Image src={item.imageUrl || "/placeholder.svg"} alt={item.name} fill className="object-contain" />
          </div>
        </DialogContent>
      </Dialog>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl font-semibold">{item.name}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLikeToggle}
            className={`${isLiked ? "text-red-500" : "text-gray-500"}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            <span className="ml-1">{likeCount}</span>
          </Button>
        </div>
        <p className="text-gray-600 mb-2">{item.description}</p>
        <p className="mb-1">
          <strong>Owner:</strong> {item.ownerRealname}
        </p>
        {item.status === "finished" ? (
          <>
            <p className="mb-1">
              <strong>Winner:</strong> {item.highestBidderRealname || "N/A"}
            </p>
            <p>
              <strong>Winning Bid:</strong> ₲{item.winnerBid?.toFixed(0) || "N/A"}
            </p>
          </>
        ) : (
          <>
            <p className="mb-1">
              <strong>Highest Bidder:</strong> {item.highestBidderRealname || "N/A"}
            </p>
            <p className="mb-1">
              <strong>Current Bid:</strong> ₲{item.currentBid.toFixed(0)}
            </p>
            {timeLeft && (
              <p className="bg-yellow-100 text-yellow-800 p-2 rounded-md font-semibold animate-pulse">
                <strong>Time Left:</strong> {timeLeft}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

