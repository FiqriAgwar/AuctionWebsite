import Image from "next/image";

export interface AuctionItemProps {
  item: {
    id: number;
    name: string;
    description: string;
    imageUrl: string;
    currentBid: number;
  };
}

export default function AuctionItem({ item }: AuctionItemProps) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <Image
        src={item.imageUrl || "/placeholder.svg"}
        alt={item.name}
        width={300}
        height={300}
        className="w-full h-auto"
      />
      <div className="p-4">
        <h2 className="text-2xl font-semibold mb-2">{item.name}</h2>
        <p className="text-gray-600">{item.description}</p>
      </div>
    </div>
  );
}
