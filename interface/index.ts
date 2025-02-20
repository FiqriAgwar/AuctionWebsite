export interface Profile {
  id: string
  username: string
  balance: number
}

export interface Bid {
  amount: number
  timestamp: string
  isUserBid: boolean
}

export interface AuctionItemConfig {
  id: number
  name: string
  description: string
  imageUrl: string
  currentBid: number
  status: "upcoming" | "active" | "paused" | "finished"
  auctionEndTime: string | null
  ownerId: string,
  ownerRealname: string,
  highestBidderId: string | null
  highestBidderRealname: string | null
  winnerBid: number | null
  order: number
  likeCount: number
}

