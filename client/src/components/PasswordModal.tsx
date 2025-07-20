/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { passwordApi, PasswordEntry, CreatePasswordRequest, UpdatePasswordRequest, GeneratePasswordRequest } from '@/lib/api';
import { X, Eye, EyeOff, Globe, User, Key, FileText, Save, RefreshCw, Settings, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface PasswordModalProps {
  password?: PasswordEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (password: PasswordEntry, isNew: boolean) => void;
  isEditing: boolean;
  initialGeneratedPassword?: string;
}

export default function PasswordModal({
  password,
  isOpen,
  onClose,
  onSave,
  isEditing,
  initialGeneratedPassword,
}: PasswordModalProps) {
  const { getIdToken } = useAuth();
  const [formData, setFormData] = useState({
    service_name: '',
    service_url: '',
    username: '',
    password: '',
    notes: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [options, setOptions] = useState<GeneratePasswordRequest>({
    length: 16,
    include_upper: true,
    include_lower: true,
    include_numbers: true,
    include_symbols: false,
    exclude_similar: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (password && isEditing) {
        setFormData({
          service_name: password.service_name || '',
          service_url: password.service_url || '',
          username: password.username || '',
          password: password.password || '',
          notes: password.notes || '',
        });
      } else {
        setFormData({
          service_name: '',
          service_url: '',
          username: '',
          password: initialGeneratedPassword || '',
          notes: '',
        });
      }
      setShowPassword(false);
      setShowGenerator(false);
      setGeneratedPassword('');
    }
  }, [password, isEditing, isOpen, initialGeneratedPassword]);

  const generatePassword = async () => {
    if (!options.include_upper && !options.include_lower && !options.include_numbers && !options.include_symbols) {
      toast.error('Please select at least one character type');
      return;
    }

    setGeneratorLoading(true);
    try {
      // Client-side generation for better UX
      let charset = '';
      if (options.include_upper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (options.include_lower) charset += 'abcdefghijklmnopqrstuvwxyz';
      if (options.include_numbers) charset += '0123456789';
      if (options.include_symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

      if (options.exclude_similar) {
        charset = charset.replace(/[il1Lo0O]/g, '');
      }

      let newPassword = '';
      for (let i = 0; i < options.length; i++) {
        newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
      }

      setGeneratedPassword(newPassword);
      toast.success('Password generated successfully!');
    } catch (error: any) {
      console.error('Error generating password:', error);
      toast.error('Failed to generate password');
    } finally {
      setGeneratorLoading(false);
    }
  };

  const useGeneratedPassword = () => {
    setFormData(prev => ({
      ...prev,
      password: generatedPassword
    }));
    setShowGenerator(false);
    toast.success('Generated password added to form!');
  };

  const handleCopyPassword = async (passwordToCopy: string) => {
    try {
      await navigator.clipboard.writeText(passwordToCopy);
      toast.success('Password copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy password');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service_name.trim() || !formData.password.trim()) {
      toast.error('Service name and password are required');
      return;
    }

    setLoading(true);

    try {
      const token = await getIdToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      let savedPassword: PasswordEntry;

      if (isEditing && password) {
        const updateData: UpdatePasswordRequest = {};

        if (formData.service_name !== password.service_name) {
          updateData.service_name = formData.service_name;
        }
        if (formData.service_url !== (password.service_url || '')) {
          updateData.service_url = formData.service_url || undefined;
        }
        if (formData.username !== (password.username || '')) {
          updateData.username = formData.username || undefined;
        }
        if (formData.password !== password.password) {
          updateData.password = formData.password;
        }
        if (formData.notes !== (password.notes || '')) {
          updateData.notes = formData.notes || undefined;
        }

        savedPassword = await passwordApi.updatePassword(password.id, updateData, token);
        toast.success('Password updated successfully');
      } else {
        const createData: CreatePasswordRequest = {
          service_name: formData.service_name,
          service_url: formData.service_url || undefined,
          username: formData.username || undefined,
          password: formData.password,
          notes: formData.notes || undefined,
        };

        savedPassword = await passwordApi.createPassword(createData, token);
        toast.success('Password created successfully');
      }

      onSave(savedPassword, !isEditing);
    } catch (error: any) {
      console.error('Error saving password:', error);
      toast.error(error.response?.data?.error || 'Failed to save password');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (key: keyof GeneratePasswordRequest, value: boolean | number) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getPasswordStrength = (passwordToCheck: string) => {
    if (!passwordToCheck) return { strength: 0, label: 'None', color: 'bg-gray-300 dark:bg-gray-700' };

    let score = 0;

    if (passwordToCheck.length >= 8) score += 1;
    if (passwordToCheck.length >= 12) score += 1;
    if (passwordToCheck.length >= 16) score += 1;

    if (/[a-z]/.test(passwordToCheck)) score += 1;
    if (/[A-Z]/.test(passwordToCheck)) score += 1;
    if (/[0-9]/.test(passwordToCheck)) score += 1;
    if (/[^a-zA-Z0-9]/.test(passwordToCheck)) score += 1;

    if (score <= 2) return { strength: 25, label: 'Weak', color: 'bg-gray-400 dark:bg-gray-600' };
    if (score <= 4) return { strength: 50, label: 'Fair', color: 'bg-gray-500 dark:bg-gray-500' };
    if (score <= 6) return { strength: 75, label: 'Good', color: 'bg-gray-700 dark:bg-gray-400' };
    return { strength: 100, label: 'Strong', color: 'bg-black dark:bg-white' };
  };

  const strength = getPasswordStrength(formData.password);
  const generatedStrength = getPasswordStrength(generatedPassword);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-black rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            {isEditing ? 'Edit Password' : 'Add New Password'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {!showGenerator ? (
            /* Main Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Service Name */}
              <div>
                <label htmlFor="service_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="service_name"
                    type="text"
                    required
                    value={formData.service_name}
                    onChange={(e) => handleInputChange('service_name', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="e.g., Gmail, Facebook, GitHub"
                  />
                </div>
              </div>

              {/* Service URL */}
              <div>
                <label htmlFor="service_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="service_url"
                    type="url"
                    value={formData.service_url}
                    onChange={(e) => handleInputChange('service_url', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="Enter username or email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGenerator(true)}
                    className="text-sm text-black dark:text-white hover:underline flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Generate
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="block w-full pl-10 pr-20 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="Enter password"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(formData.password)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
                      disabled={!formData.password}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Strength</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">{strength.label}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.strength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors resize-none"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-black border-t-transparent mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? 'Update Password' : 'Save Password'}
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Password Generator */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                  <h3 className="text-lg font-medium text-black dark:text-white">Generate Password</h3>
                </div>
                <button
                  onClick={() => setShowGenerator(false)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                >
                  Back to form
                </button>
              </div>

              {/* Generated Password Display */}
              {generatedPassword && (
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Generated Password
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={generatedPassword}
                          readOnly
                          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-black dark:text-white font-mono text-sm"
                        />
                      </div>
                      <button
                        onClick={() => handleCopyPassword(generatedPassword)}
                        className="p-3 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={useGeneratedPassword}
                        className="px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:shadow-lg transition-all font-medium"
                      >
                        Use This
                      </button>
                    </div>
                  </div>

                  {/* Password Strength */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Strength</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{generatedStrength.label}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${generatedStrength.color}`}
                        style={{ width: `${generatedStrength.strength}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Length Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password Length: {options.length}
                </label>
                <input
                  type="range"
                  min="8"
                  max="64"
                  value={options.length}
                  onChange={(e) => handleOptionChange('length', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>8</span>
                  <span>64</span>
                </div>
              </div>

              {/* Character Type Options */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'include_upper', label: 'Uppercase (A-Z)' },
                  { key: 'include_lower', label: 'Lowercase (a-z)' },
                  { key: 'include_numbers', label: 'Numbers (0-9)' },
                  { key: 'include_symbols', label: 'Symbols (!@#$)' },
                ].map((option) => (
                  <div key={option.key} className="flex items-center">
                    <input
                      id={option.key}
                      type="checkbox"
                      checked={options[option.key as keyof GeneratePasswordRequest] as boolean}
                      onChange={(e) => handleOptionChange(option.key as keyof GeneratePasswordRequest, e.target.checked)}
                      className="h-4 w-4 text-black dark:text-white focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor={option.key} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {option.label}
                    </label>
                  </div>
                ))}

                <div className="col-span-2 flex items-center">
                  <input
                    id="exclude_similar"
                    type="checkbox"
                    checked={options.exclude_similar}
                    onChange={(e) => handleOptionChange('exclude_similar', e.target.checked)}
                    className="h-4 w-4 text-black dark:text-white focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label htmlFor="exclude_similar" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Exclude similar characters (il1Lo0O)
                  </label>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex justify-center">
                <button
                  onClick={generatePassword}
                  disabled={generatorLoading}
                  className="flex items-center px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatorLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-black border-t-transparent mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate Password
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: none;
        }

        .dark .slider::-webkit-slider-thumb {
          background: #fff;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: none;
        }

        .dark .slider::-moz-range-thumb {
          background: #fff;
        }
      `}</style>
    </div>
  );
}