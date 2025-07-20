'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Shield, Lock, Key, Eye, CheckCircle } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const features = [
    {
      icon: Lock,
      title: 'Military-Grade Encryption',
      description: 'Your passwords are encrypted with AES-256 encryption, the same standard used by governments and banks.',
    },
    {
      icon: Key,
      title: 'Secure Password Generation',
      description: 'Generate strong, unique passwords with customizable options for every account.',
    },
    {
      icon: Eye,
      title: 'Easy Access',
      description: 'Access your passwords securely from anywhere with our intuitive interface.',
    },
    {
      icon: CheckCircle,
      title: 'Zero Knowledge',
      description: 'We never see your passwords. Everything is encrypted before it reaches our servers.',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="relative">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
              <span className="text-xl font-bold">SecurePass</span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link
                href="/auth/login"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-blue-600 dark:bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-20">
          <div className="mx-auto h-20 w-20 bg-blue-600 dark:bg-blue-600 rounded-full flex items-center justify-center mb-8 shadow-glow">
            <Shield className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Secure Your Digital Life
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
            Generate, store, and manage all your passwords in one secure place.
            Never forget a password again with military-grade encryption.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              href="/auth/register"
              className="bg-blue-600 dark:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors shadow-lg"
            >
              Start Free Today
            </Link>
            <Link
              href="/auth/login"
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Why Choose SecurePass?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Built with security and simplicity in mind, SecurePass offers enterprise-grade
              password management for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 text-center hover:shadow-md dark:hover:shadow-gray-900/30 transition-shadow"
              >
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Secure Your Passwords?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of users who trust SecurePass to keep their digital lives secure.
              Get started in minutes with our free account.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center bg-blue-600 dark:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors shadow-lg"
            >
              <Shield className="h-5 w-5 mr-2" />
              Create Free Account
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Shield className="h-6 w-6 text-blue-400 dark:text-blue-400 mr-2" />
              <span className="text-lg font-semibold">SecurePass</span>
            </div>
            <div className="text-sm text-gray-400 dark:text-gray-500">
              © 2024 SecurePass. Built with security in mind.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}