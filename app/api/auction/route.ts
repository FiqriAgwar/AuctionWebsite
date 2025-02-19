import { NextResponse } from "next/server"

// In-memory bid history (in a real app, this would be stored in a database)
let bidHistory: { amount: number; timestamp: string; userEmail: string }[] = []

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // const id = searchParams.get("id")

  // Return the bid history for the specified auction
  return NextResponse.json({ bidHistory })
}

export async function POST(request: Request) {
  const data = await request.json()

  if (data.type === "place_bid") {
    const newBid = {
      amount: data.amount,
      timestamp: new Date().toISOString(),
      userEmail: data.userEmail,
    }
    bidHistory.unshift(newBid)
    bidHistory = bidHistory.slice(0, 10) // Keep only the 10 most recent bids

    // In a real application, you would broadcast this update to all connected clients
    // For now, we'll just return the updated bid history
    return NextResponse.json({
      type: "bid_update",
      amount: data.amount,
      userEmail: data.userEmail,
      history: bidHistory,
    })
  }

  return NextResponse.json({ error: "Invalid request type" }, { status: 400 })
}

