'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { passwordApi, PasswordEntry } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Edit,
  Trash2,
  Shield,
  Key,
  Globe,
  User,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PasswordModal from '@/components/PasswordModal';
import GeneratePasswordModal from '@/components/GeneratePasswordModal';
import Navbar from '@/components/Navbar';

export default function Dashboard() {
  const { user, getIdToken } = useAuth();
  const router = useRouter();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [selectedPassword, setSelectedPassword] = useState<PasswordEntry | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [generatedPasswordToSave, setGeneratedPasswordToSave] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadPasswords();
  }, [user, router]);

  const loadPasswords = async () => {
    try {
      const token = await getIdToken();
      if (token) {
        const data = await passwordApi.getPasswords(token);
        setPasswords(data);
      }
    } catch (error) {
      toast.error('Failed to load passwords');
      console.error('Error loading passwords:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Password copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy password');
    }
  };

  const handleDeletePassword = async (id: string) => {
    if (!confirm('Are you sure you want to delete this password?')) {
      return;
    }

    try {
      const token = await getIdToken();
      if (token) {
        await passwordApi.deletePassword(id, token);
        setPasswords(passwords.filter(p => p.id !== id));
        toast.success('Password deleted successfully');
      }
    } catch (error) {
      toast.error('Failed to delete password');
      console.error('Error deleting password:', error);
    }
  };

  const handleEditPassword = (password: PasswordEntry) => {
    setSelectedPassword(password);
    setIsEditing(true);
    setGeneratedPasswordToSave('');
    setIsPasswordModalOpen(true);
  };

  const handleAddPassword = () => {
    setSelectedPassword(null);
    setIsEditing(false);
    setGeneratedPasswordToSave('');
    setIsPasswordModalOpen(true);
  };

  const handleGeneratePassword = () => {
    setIsGenerateModalOpen(true);
  };

  const handleSaveGeneratedPassword = (password: string) => {
    setGeneratedPasswordToSave(password);
    setSelectedPassword(null);
    setIsEditing(false);
    setIsGenerateModalOpen(false);
    setIsPasswordModalOpen(true);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredPasswords = passwords.filter(password =>
    password.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (password.username && password.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (password.service_url && password.service_url.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePasswordSaved = (password: PasswordEntry, isNew: boolean) => {
    if (isNew) {
      setPasswords([...passwords, password]);
    } else {
      setPasswords(passwords.map(p => p.id === password.id ? password : p));
    }
    setIsPasswordModalOpen(false);
    setSelectedPassword(null);
    setGeneratedPasswordToSave('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black dark:border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-black dark:text-white">Your Passwords</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your secure passwords</p>
          </div>

          <div className="flex space-x-3 animate-slide-up">
            <button
              onClick={handleGeneratePassword}
              className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-200 shadow-lg"
            >
              <Key className="h-4 w-4 mr-2" />
              Generate
            </button>
            <button
              onClick={handleAddPassword}
              className="flex items-center px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Password
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 animate-slide-up">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search passwords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors shadow-lg"
            />
          </div>
        </div>

        {/* Password Grid */}
        {filteredPasswords.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Shield className="h-10 w-10 text-black dark:text-white" />
            </div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
              {passwords.length === 0 ? 'No passwords yet' : 'No passwords found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto">
              {passwords.length === 0
                ? 'Add your first password to get started with secure password management.'
                : 'Try adjusting your search terms to find what you\'re looking for.'
              }
            </p>
            {passwords.length === 0 && (
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center px-6 py-3 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Generate & Save Password
                </button>
                <button
                  onClick={handleAddPassword}
                  className="inline-flex items-center px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Password Manually
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPasswords.map((password, index) => (
              <div
                key={password.id}
                className="group bg-white dark:bg-black rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-800 hover:shadow-2xl hover:scale-105 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Service Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="h-12 w-12 bg-black dark:bg-white rounded-xl flex items-center justify-center mr-3 shadow-sm">
                      <Globe className="h-6 w-6 text-white dark:text-black" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-black dark:text-white truncate">
                        {password.service_name}
                      </h3>
                      {password.service_url && (
                        <a
                          href={password.service_url.startsWith('http') ? password.service_url : `https://${password.service_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white truncate block transition-colors"
                        >
                          {password.service_url}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditPassword(password)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePassword(password.id)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Password Details */}
                <div className="space-y-3">
                  {password.username && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-3 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{password.username}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center flex-1 min-w-0">
                      <Key className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-3 flex-shrink-0" />
                      <span className="text-sm font-mono truncate text-black dark:text-white">
                        {showPasswords[password.id] ? password.password : '••••••••••••'}
                      </span>
                    </div>
                    <div className="flex space-x-1 ml-3">
                      <button
                        onClick={() => togglePasswordVisibility(password.id)}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                      >
                        {showPasswords[password.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopyPassword(password.password)}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {password.notes && (
                    <div className="flex items-start">
                      <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{password.notes}</span>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Updated {new Date(password.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isPasswordModalOpen && (
        <PasswordModal
          password={selectedPassword}
          isOpen={isPasswordModalOpen}
          onClose={() => {
            setIsPasswordModalOpen(false);
            setSelectedPassword(null);
            setGeneratedPasswordToSave('');
          }}
          onSave={handlePasswordSaved}
          isEditing={isEditing}
          initialGeneratedPassword={generatedPasswordToSave}
        />
      )}

      {isGenerateModalOpen && (
        <GeneratePasswordModal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          onSavePassword={handleSaveGeneratedPassword}
        />
      )}
    </div>
  );
}