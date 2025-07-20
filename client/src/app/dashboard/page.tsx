'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { passwordApi, PasswordEntry } from '../../lib/api';
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
  LogOut,
  Key,
  Globe,
  User,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PasswordModal from '../../components/PasswordModal';
import GeneratePasswordModal from '../../components/GeneratePasswordModal';
import ThemeToggle from '../../components/ThemeToggle';

export default function Dashboard() {
  const { user, logout, getIdToken } = useAuth();
  const router = useRouter();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [selectedPassword, setSelectedPassword] = useState<PasswordEntry | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
    setIsPasswordModalOpen(true);
  };

  const handleAddPassword = () => {
    setSelectedPassword(null);
    setIsEditing(false);
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
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="glass-effect border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600 dark:bg-blue-600 rounded-xl mr-3 shadow-glow">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">SecurePass</h1>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                Welcome, {user?.email}
              </span>
              <button
                onClick={logout}
                className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-balance">Your Passwords</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your secure passwords</p>
          </div>

          <div className="flex space-x-3 animate-slide-up">
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="flex items-center px-4 py-2 bg-emerald-600 dark:bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-all duration-200 shadow-card hover:shadow-card-hover"
            >
              <Key className="h-4 w-4 mr-2" />
              Generate
            </button>
            <button
              onClick={handleAddPassword}
              className="btn-primary flex items-center"
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
              className="input-field pl-10 w-full shadow-card"
            />
          </div>
        </div>

        {/* Password Grid */}
        {filteredPasswords.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="p-4 primary-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Shield className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {passwords.length === 0 ? 'No passwords yet' : 'No passwords found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto text-balance">
              {passwords.length === 0
                ? 'Add your first password to get started with secure password management.'
                : 'Try adjusting your search terms to find what you\'re looking for.'
              }
            </p>
            {passwords.length === 0 && (
              <button
                onClick={handleAddPassword}
                className="btn-primary inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Password
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPasswords.map((password, index) => (
              <div
                key={password.id}
                className="card group animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Service Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {password.service_name}
                      </h3>
                      {password.service_url && (
                        <a
                          href={password.service_url.startsWith('http') ? password.service_url : `https://${password.service_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate block transition-colors"
                        >
                          {password.service_url}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditPassword(password)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePassword(password.id)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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

                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center flex-1 min-w-0">
                      <Key className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-3 flex-shrink-0" />
                      <span className="text-sm font-mono truncate text-gray-900 dark:text-gray-100">
                        {showPasswords[password.id] ? password.password : '••••••••••••'}
                      </span>
                    </div>
                    <div className="flex space-x-1 ml-3">
                      <button
                        onClick={() => togglePasswordVisibility(password.id)}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                      >
                        {showPasswords[password.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopyPassword(password.password)}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all"
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
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
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
          }}
          onSave={handlePasswordSaved}
          isEditing={isEditing}
        />
      )}

      {isGenerateModalOpen && (
        <GeneratePasswordModal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
        />
      )}
    </div>
  );
}