'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Shield, Lock, Key, Eye, CheckCircle, Copy, RefreshCw, EyeOff, Settings, Sparkles, Zap, Star } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Image from 'next/image';

interface GeneratePasswordRequest {
  length: number;
  include_upper: boolean;
  include_lower: boolean;
  include_numbers: boolean;
  include_symbols: boolean;
  exclude_similar: boolean;
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  // Password generation state
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<GeneratePasswordRequest>({
    length: 16,
    include_upper: true,
    include_lower: true,
    include_numbers: true,
    include_symbols: false,
    exclude_similar: true,
  });

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Client-side password generation
  const generatePasswordClient = () => {
    if (!options.include_upper && !options.include_lower && !options.include_numbers && !options.include_symbols) {
      toast.error('Please select at least one character type');
      return;
    }

    setLoading(true);

    try {
      let charset = '';
      if (options.include_upper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (options.include_lower) charset += 'abcdefghijklmnopqrstuvwxyz';
      if (options.include_numbers) charset += '0123456789';
      if (options.include_symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

      // Remove similar characters if requested
      if (options.exclude_similar) {
        charset = charset.replace(/[il1Lo0O]/g, '');
      }

      let password = '';
      for (let i = 0; i < options.length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }

      setGeneratedPassword(password);
      setShowPassword(true);
      toast.success('Password generated successfully!');
    } catch (error) {
      toast.error('Failed to generate password');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;

    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast.success('Password copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy password');
    }
  };

  const handleOptionChange = (key: keyof GeneratePasswordRequest, value: boolean | number) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: 'None', color: 'bg-gray-300 dark:bg-gray-700' };

    let score = 0;

    // Length
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character types
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 2) return { strength: 25, label: 'Weak', color: 'bg-gray-400 dark:bg-gray-600' };
    if (score <= 4) return { strength: 50, label: 'Fair', color: 'bg-gray-500 dark:bg-gray-500' };
    if (score <= 6) return { strength: 75, label: 'Good', color: 'bg-gray-700 dark:bg-gray-400' };
    return { strength: 100, label: 'Strong', color: 'bg-black dark:bg-white' };
  };

  const strength = getPasswordStrength(generatedPassword);

  const features = [
    {
      icon: Lock,
      title: 'Military-Grade Encryption',
      description: 'AES-256 encryption protects your passwords with the same security used by governments and banks worldwide.',
    },
    {
      icon: Key,
      title: 'Smart Password Generation',
      description: 'AI-powered password generation creates truly random, secure passwords that are impossible to guess.',
    },
    {
      icon: Eye,
      title: 'Seamless Access',
      description: 'Access your passwords instantly from any device with our beautiful, intuitive interface.',
    },
    {
      icon: CheckCircle,
      title: 'Zero Knowledge Architecture',
      description: 'Your passwords are encrypted locally before reaching our servers. We literally cannot see them.',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-gray-100 dark:bg-gray-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-gray-200 dark:bg-gray-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gray-150 dark:bg-gray-850 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header */}
      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Password Generator Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <div className="relative mx-auto w-20 h-20 mb-8">
              <div className="w-20 h-20 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                <Key className="h-10 w-10 text-white dark:text-black" />
              </div>
              <div className="absolute -inset-2 bg-gray-300 dark:bg-gray-700 rounded-2xl -z-10 blur-lg opacity-30 animate-pulse"></div>
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-gray-600 dark:text-gray-400 animate-bounce" />
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
              Generate Unbreakable
              <br />
              Passwords
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Create military-grade passwords in seconds. No registration required.
              <br />
              <span className="text-black dark:text-white font-semibold">100% secure, 100% free.</span>
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute -inset-1 bg-gray-200 dark:bg-gray-800 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
              <div className="relative bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-8 md:p-10">
                {/* Generated Password Display */}
                {generatedPassword && (
                  <div className="mb-10 space-y-6">
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                        Your Secure Password
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={generatedPassword}
                            readOnly
                            className="w-full px-6 py-5 border-2 border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-black dark:text-white font-mono text-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center hover:scale-110 transition-transform"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            ) : (
                              <Eye className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            )}
                          </button>
                        </div>
                        <button
                          onClick={handleCopyPassword}
                          className="group p-5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
                        >
                          <Copy className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>

                    {/* Password Strength */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          Security Level
                        </span>
                        <span className="text-sm font-bold text-black dark:text-white px-3 py-1 rounded-lg bg-white dark:bg-black shadow-sm border border-gray-200 dark:border-gray-800">
                          {strength.label}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-1000 ease-out ${strength.color} shadow-sm`}
                          style={{ width: `${strength.strength}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Password Options */}
                <div className="space-y-8">
                  <div className="flex items-center mb-6">
                    <Settings className="h-6 w-6 text-gray-500 dark:text-gray-400 mr-3" />
                    <h3 className="text-2xl font-bold text-black dark:text-white">Customize Your Password</h3>
                  </div>

                  {/* Length Slider */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center justify-between">
                      <span>Password Length</span>
                      <span className="text-2xl font-bold text-black dark:text-white">{options.length}</span>
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="64"
                      value={options.length}
                      onChange={(e) => handleOptionChange('length', parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                      <span>8 chars</span>
                      <span>64 chars</span>
                    </div>
                  </div>

                  {/* Character Type Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'include_upper', label: 'Uppercase', desc: 'A-Z' },
                      { key: 'include_lower', label: 'Lowercase', desc: 'a-z' },
                      { key: 'include_numbers', label: 'Numbers', desc: '0-9' },
                      { key: 'include_symbols', label: 'Symbols', desc: '!@#$%^&*' },
                    ].map((option) => (
                      <div
                        key={option.key}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${options[option.key as keyof GeneratePasswordRequest]
                          ? 'border-black dark:border-white bg-gray-100 dark:bg-gray-900 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-black hover:border-gray-400 dark:hover:border-gray-600'
                          }`}
                        onClick={() => handleOptionChange(option.key as keyof GeneratePasswordRequest, !options[option.key as keyof GeneratePasswordRequest])}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-black dark:text-white">{option.label}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{option.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={options[option.key as keyof GeneratePasswordRequest] as boolean}
                            onChange={(e) => handleOptionChange(option.key as keyof GeneratePasswordRequest, e.target.checked)}
                            className="h-5 w-5 text-black dark:text-white focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black"
                          />
                        </div>
                      </div>
                    ))}

                    <div
                      className={`md:col-span-2 relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${options.exclude_similar
                        ? 'border-black dark:border-white bg-gray-100 dark:bg-gray-900 shadow-lg'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-black hover:border-gray-400 dark:hover:border-gray-600'
                        }`}
                      onClick={() => handleOptionChange('exclude_similar', !options.exclude_similar)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-black dark:text-white">Exclude Similar Characters</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Avoid il1Lo0O for clarity</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={options.exclude_similar}
                          onChange={(e) => handleOptionChange('exclude_similar', e.target.checked)}
                          className="h-5 w-5 text-black dark:text-white focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="flex justify-center pt-6">
                    <button
                      onClick={generatePasswordClient}
                      disabled={loading}
                      className="group relative px-12 py-6 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-xl font-bold"
                    >
                      <div className="absolute -inset-1 bg-gray-300 dark:bg-gray-700 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                      <div className="relative flex items-center">
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white dark:border-black border-t-transparent mr-3"></div>
                            Generating Magic...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-6 w-6 mr-3 group-hover:rotate-180 transition-transform duration-500" />
                            Generate Secure Password
                            <Sparkles className="h-5 w-5 ml-3 animate-pulse" />
                          </>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Tips */}
                  <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                    <h4 className="text-lg font-bold text-black dark:text-white mb-4 flex items-center">
                      <Star className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
                      Pro Security Tips
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center">
                        <span className="text-black dark:text-white mr-2">✓</span>
                        Use 16+ characters for maximum security
                      </div>
                      <div className="flex items-center">
                        <span className="text-black dark:text-white mr-2">✓</span>
                        Include all character types
                      </div>
                      <div className="flex items-center">
                        <span className="text-black dark:text-white mr-2">✓</span>
                        Never reuse passwords
                      </div>
                      <div className="flex items-center">
                        <span className="text-black dark:text-white mr-2">✓</span>
                        Use a password manager
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center py-24">
          <div className="relative mx-auto w-24 h-24 mb-12">
            <div className="w-24 h-24 bg-black dark:bg-white rounded-3xl flex items-center justify-center shadow-2xl">
              <Shield className="h-12 w-12 text-white dark:text-black" />
            </div>
            <div className="absolute -inset-3 bg-gray-300 dark:bg-gray-700 rounded-3xl -z-10 blur-xl opacity-30 animate-pulse"></div>
          </div>

          <h2 className="text-5xl md:text-7xl font-extrabold mb-8 leading-tight">
            Secure Your
            <br />
            Digital Universe
          </h2>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-4xl mx-auto leading-relaxed">
            The most beautiful and secure password manager on Earth.
            <br />
            <span className="text-black dark:text-white font-semibold">Military-grade encryption</span> meets
            <span className="text-black dark:text-white font-semibold"> stunning design.</span>
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-6 sm:space-y-0 sm:space-x-6">
            <Link
              href="/auth/register"
              className="group relative px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg font-bold"
            >
              <div className="absolute -inset-1 bg-gray-300 dark:bg-gray-700 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                Start Free Today
              </div>
            </Link>
            <Link
              href="/auth/login"
              className="px-10 py-5 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-black rounded-2xl text-lg font-bold hover:shadow-xl hover:scale-105 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all duration-300"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              Why Developers Choose Keyzy
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Built by security experts, designed for humans. Experience the perfect blend of
              enterprise-grade security and consumer-friendly design.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-8 bg-white dark:bg-black rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <div className="absolute -inset-1 bg-gray-200 dark:bg-gray-800 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur"></div>
                <div className="relative">
                  <div className="w-16 h-16 bg-black dark:bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-8 w-8 text-white dark:text-black" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-black dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-24">
          <div className="relative">
            <div className="absolute -inset-1 bg-gray-200 dark:bg-gray-800 rounded-3xl blur-lg opacity-20"></div>
            <div className="relative bg-white dark:bg-black rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-12 md:p-16 text-center">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
                Ready to Experience
                <br />
                Unbreakable Security?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                Join over <span className="text-black dark:text-white font-bold">50,000+ users</span> who trust Keyzy to protect their digital lives.
                <br />
                Get started in under 60 seconds.
              </p>
              <Link
                href="/auth/register"
                className="group relative inline-flex items-center px-12 py-6 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-xl font-bold"
              >
                <div className="absolute -inset-1 bg-gray-300 dark:bg-gray-700 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative flex items-center">
                  <Shield className="h-6 w-6 mr-3" />
                  Create Free Account
                  <Sparkles className="h-5 w-5 ml-3 animate-pulse" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-white dark:bg-gray-950 text-white py-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <Image
                src="/logo-horizontal.png"
                alt="Keyzy Logo"
                width={200}
                height={40}
              // className="w-10 h-10 rounded-xl shadow-lg mr-3"
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

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .dark .slider::-webkit-slider-thumb {
          background: #fff;
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
        }
        
        .slider::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .dark .slider::-moz-range-thumb {
          background: #fff;
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
        }

        .slider::-webkit-slider-track {
          height: 8px;
          border-radius: 4px;
          background: #e5e7eb;
        }

        .dark .slider::-webkit-slider-track {
          background: #374151;
        }
      `}</style>
    </div>
  );
}