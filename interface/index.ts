export interface Profile {
  id: string;
  username: string;
  balance: number;
}

export interface Bid {
  amount: number;
  timestamp: string;
  isUserBid: boolean;
}

export interface AuctionItemConfig {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  currentBid: number;
  onlineBid: boolean;
  winnerId: string | null;
  winnerBid: number | null;
  likeCount: number;
}
