'use client';

import { LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/lib/theme";


const Navbar = () => {
  const { user, logout } = useAuth();
  const {
    resolvedTheme
  } = useTheme();
  return (
    <header className="bg-white/90 dark:bg-black/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="">
              <Image
                src={resolvedTheme === "dark" ? "/logo-horizontal-dark.png" : "/logo-horizontal.png"}
                alt="Keyzy Logo"
                width={130}
                height={50}
                // className="h-8 w-auto"
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
          </div>

          {
            user
              ?
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                  Welcome, {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
              :
              <div className="flex items-center space-x-6">
                <ThemeToggle />
                <Link
                  href="/auth/login"
                  className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
                >
                  Get Started
                </Link>
              </div>
          }
        </div>
      </div>
    </header>
  )
}

export default Navbar