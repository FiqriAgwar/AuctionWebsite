"use client"

import { useEffect, useState, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface User {
  id: string
  realname: string
  balance: number
  is_admin: boolean
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()

  const refreshUserData = useCallback(async () => {
    const storedUser = localStorage.getItem("auction_user")
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      const { data, error } = await supabase
        .from("profiles")
        .select("realname, balance, is_admin")
        .eq("id", parsedUser.id)
        .single()

      if (error) {
        console.error("Error refreshing user data:", error)
      } else {
        const updatedUser = { ...parsedUser, ...data }
        localStorage.setItem("auction_user", JSON.stringify(updatedUser))
        setUser(updatedUser)
      }
    }
  }, [supabase])

  useEffect(() => {
    refreshUserData()

    const channel = supabase
      .channel(`user-${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          setUser((prevUser) => ({
            ...prevUser!,
            balance: payload.new.balance,
          }))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user?.id, refreshUserData])

  if (!user) return null

  return (
    <header className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Auction Site</h1>
        <div className="flex items-center">
          <div className="text-right mr-4">
            <p className="font-semibold">{user.realname}</p>
            <p>Balance: ₲{user.balance.toFixed(0)}</p>
          </div>
          <Button onClick={refreshUserData} variant="secondary" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

