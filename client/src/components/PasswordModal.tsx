/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { passwordApi, PasswordEntry, CreatePasswordRequest, UpdatePasswordRequest } from '@/lib/api';
import { X, Eye, EyeOff, Globe, User, Key, FileText, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface PasswordModalProps {
  password?: PasswordEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (password: PasswordEntry, isNew: boolean) => void;
  isEditing: boolean;
}

export default function PasswordModal({
  password,
  isOpen,
  onClose,
  onSave,
  isEditing,
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
          password: '',
          notes: '',
        });
      }
      setShowPassword(false);
    }
  }, [password, isEditing, isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Password' : 'Add New Password'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                className="input-field pl-10"
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
                className="input-field pl-10"
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
                className="input-field pl-10"
                placeholder="Enter username or email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password *
            </label>
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
                className="input-field pl-10 pr-10"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                )}
              </button>
            </div>
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
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors resize-none"
                placeholder="Add any additional notes..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
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
      </div>
    </div>
  );
}