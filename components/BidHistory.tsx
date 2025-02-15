import { Badge } from "@/components/ui/badge"

interface Bid {
  amount: number
  timestamp: string
  isUserBid: boolean
  userEmail: string
}

interface BidHistoryProps {
  bids: Bid[]
}

export default function BidHistory({ bids }: BidHistoryProps) {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Bid History</h3>
      <ul className="space-y-2">
        {bids.map((bid, index) => (
          <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
            <span className="font-medium">${bid.amount.toFixed(2)}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{new Date(bid.timestamp).toLocaleString()}</span>
              <span className="text-sm text-gray-600">{bid.userEmail}</span>
              {bid.isUserBid && (
                <Badge variant="success" className="text-xs">
                  Your Bid
                </Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
      {bids.length === 0 && <p className="text-gray-500 text-center">No bids yet</p>}
    </div>
  )
}

