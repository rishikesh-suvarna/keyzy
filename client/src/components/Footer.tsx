'use client';

import { useTheme } from "@/lib/theme";
import Image from "next/image";

const Footer = () => {
  const { resolvedTheme } = useTheme();
  return (
    <footer className="relative z-10 bg-white dark:bg-gray-950 text-white py-8 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-6 md:mb-0">
            <Image
              src={resolvedTheme === "dark" ? "/logo-horizontal-dark.png" : "/logo-horizontal.png"}
              alt="Keyzy Logo"
              width={200}
              height={40}
            />
          </div>
          <div className="text-center md:text-right">
            <p className="text-gray-400 mb-2">
              © 2025 Keyzy. Securing the digital world, one password at a time.
            </p>
            <p className="text-sm text-gray-500">
              Built with ♥ for security and ✨ for beauty
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer