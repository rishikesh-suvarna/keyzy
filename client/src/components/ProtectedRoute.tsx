'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '../lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/auth/login', '/auth/register']
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      router.push('/auth/login')
    }

    // If user is logged in and on a public route, redirect to dashboard
    if (!loading && user && (pathname === '/auth/login' || pathname === '/auth/register')) {
      router.push('/dashboard')
    }
  }, [user, loading, router, pathname, isPublicRoute])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  // For protected routes, only render if user is authenticated
  if (!isPublicRoute && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  return <>{children}</>
}