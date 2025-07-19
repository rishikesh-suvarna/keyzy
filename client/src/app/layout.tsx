import { AuthProvider } from '@/lib/auth'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata = {
  title: 'SecurePass - Password Manager',
  description: 'Secure password manager with military-grade encryption',
  keywords: 'password manager, security, encryption, passwords, secure',
  authors: [{ name: 'SecurePass Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              className: 'toast',
              style: {
                background: '#1f2937',
                color: '#f9fafb',
                borderRadius: '0.75rem',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
                style: {
                  background: '#059669',
                  color: '#ffffff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
                style: {
                  background: '#dc2626',
                  color: '#ffffff',
                },
              },
              loading: {
                iconTheme: {
                  primary: '#3b82f6',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}