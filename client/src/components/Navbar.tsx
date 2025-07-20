'use client';

import { LogOut, Shield } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/lib/auth";


const Navbar = () => {
  const { user, logout } = useAuth();
  return (
    <header className="bg-white/90 dark:bg-black/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="p-2 bg-black dark:bg-white rounded-xl mr-3 shadow-lg">
              <Shield className="h-6 w-6 text-white dark:text-black" />
            </div>
            <h1 className="text-xl font-bold text-black dark:text-white">Keyzy</h1>
          </div>

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
        </div>
      </div>
    </header>
  )
}

export default Navbar