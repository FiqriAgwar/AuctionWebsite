"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface User {
  id: string;
  username: string;
  balance: number;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const storedUser = localStorage.getItem("auction_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      // Set up real-time subscription for user balance updates
      const channel = supabase
        .channel(`user-${parsedUser.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${parsedUser.id}`,
          },
          (payload) => {
            setUser((prevUser) => ({
              ...prevUser!,
              balance: payload.new.balance,
            }));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase]);

  if (!user) return null;

  return (
    <header className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Auction Site</h1>
        <div className="text-right">
          <p className="font-semibold">{user.username}</p>
          <p>Balance: ₲{user.balance.toFixed(0)}</p>
        </div>
      </div>
    </header>
  );
}
