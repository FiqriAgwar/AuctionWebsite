"use client"

import { useEffect, useState, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface User {
  id: string
  username: string
  balance: number
}

const supabase = createClientComponentClient()

export default function Header() {
  const [user, setUser] = useState<User | null>(null)

  const fetchLatestBalance = useCallback(async (userId: string) => {
    console.log("Fetching latest balance for user:", userId)
    const { data, error } = await supabase.from("profiles").select("balance").eq("id", userId).single()

    if (error) {
      console.error("Error fetching balance:", error)
      return
    }

    if (data) {
      console.log("Fetched balance:", data.balance)
      setUser((prevUser) => {
        if (!prevUser) return null
        const updatedUser = { ...prevUser, balance: data.balance }
        console.log("Updating user state:", updatedUser)
        localStorage.setItem("auction_user", JSON.stringify(updatedUser))
        return updatedUser
      })
    }
  }, [])

  useEffect(() => {
    const setupUser = async () => {
      const storedUser = localStorage.getItem("auction_user")
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        console.log("Setting up user from localStorage:", parsedUser)
        setUser(parsedUser)
        await fetchLatestBalance(parsedUser.id)
      }
    }

    setupUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event)
      if (event === "SIGNED_IN" && session) {
        setupUser()
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        localStorage.removeItem("auction_user")
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchLatestBalance])

  useEffect(() => {
    if (!user) return

    console.log("Setting up real-time subscription for user:", user.id)
    const channel = supabase
      .channel("profile_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Received real-time update:", payload)
          fetchLatestBalance(user.id)
        },
      )
      .subscribe((status) => {
        console.log("Subscription status:", status)
      })

    return () => {
      console.log("Unsubscribing from channel")
      supabase.removeChannel(channel)
    }
  }, [user, fetchLatestBalance])

  useEffect(() => {
    console.log("User state updated:", user)
  }, [user])

  if (!user) return null

  return (
    <header className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Auction Site</h1>
        <div className="text-right">
          <p className="font-semibold">{user.username}</p>
          <p>
            Balance: ₲{user.balance.toLocaleString()}
            <button
              onClick={() => fetchLatestBalance(user.id)}
              className="text-sm underline ml-2 text-primary-foreground/80 hover:text-primary-foreground"
            >
              Refresh
            </button>
          </p>
        </div>
      </div>
    </header>
  )
}

