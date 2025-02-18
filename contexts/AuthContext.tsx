"use client";

import type React from "react";
import { createContext, useState, useEffect } from "react";
import bcrypt from "bcryptjs";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Profile } from "@/interface";

interface AuthContextType {
  user: Profile | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getSession: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser({ id: data.user.id, balance: 1500, username: "" });
      }
    };
    checkSession();
  }, []);

  async function login(username: string, password: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !data) {
      throw new Error("Username not found");
    }

    const validPassword = bcrypt.compareSync(password, data.password);

    console.log(validPassword);
    if (!validPassword) throw new Error("Invalid username or password");

    localStorage.setItem("auction_user", JSON.stringify(data));
  }

  function getSession() {
    if (typeof window === "undefined") return null; // Prevent issues in SSR
    return JSON.parse(localStorage.getItem("auction_user") || "null");
  }

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, getSession }}>
      {children}
    </AuthContext.Provider>
  );
}
