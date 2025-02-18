import { Badge } from "@/components/ui/badge";
import { Bid } from "@/interface";

interface BidHistoryProps {
  bids: Bid[];
}

export default function BidHistory({ bids }: BidHistoryProps) {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Bid History</h3>
      <ul className="space-y-2">
        {bids.length > 0 ? (
          bids.map((bid, index) => (
            <li
              key={index}
              className={`flex justify-between items-center p-2 rounded ${
                index === 0 ? "bg-green-100 font-bold" : "bg-gray-50"
              }`}
            >
              <span className="font-medium">
                ₲{bid.amount.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {new Date(bid.timestamp).toLocaleString()}
                </span>
                <span className="text-sm text-gray-600">
                  {bid.isUserBid ? "You" : "Unknown"}
                </span>
                {bid.isUserBid && (
                  <Badge variant="success" className="text-xs">
                    Your Bid
                  </Badge>
                )}
              </div>
            </li>
          ))
        ) : (
          <p className="text-gray-500 text-center">No bids yet</p>
        )}
      </ul>
    </div>
  );
}
