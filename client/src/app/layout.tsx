import { AuthProvider } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import { Toaster } from 'react-hot-toast'
import { Analytics } from "@vercel/analytics/next"
import './globals.css'

export const metadata = {
  title: 'Keyzy - Password Manager',
  description: 'Secure password manager with military-grade encryption',
  keywords: 'password manager, security, encryption, passwords, secure',
  authors: [{ name: 'Keyzy Team' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <ThemeProvider defaultTheme="light" storageKey="keyzy-theme">
          <AuthProvider>
            <div className="min-h-full">
              <Analytics />
              {children}
            </div>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: '0.75rem',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: '#1f2937',
                  color: '#f9fafb',
                },
                success: {
                  style: {
                    background: '#059669',
                    color: '#ffffff',
                  },
                },
                error: {
                  style: {
                    background: '#dc2626',
                    color: '#ffffff',
                  },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}