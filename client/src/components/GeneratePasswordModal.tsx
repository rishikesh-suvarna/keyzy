/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { passwordApi, GeneratePasswordRequest } from '@/lib/api';
import { X, Copy, RefreshCw, Eye, EyeOff, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface GeneratePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GeneratePasswordModal({
  isOpen,
  onClose,
}: GeneratePasswordModalProps) {
  const { getIdToken } = useAuth();
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

  const generatePassword = async () => {
    // Validate options
    if (!options.include_upper && !options.include_lower && !options.include_numbers && !options.include_symbols) {
      toast.error('Please select at least one character type');
      return;
    }

    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const password = await passwordApi.generatePassword(options, token);
      setGeneratedPassword(password);
      setShowPassword(true);
    } catch (error: any) {
      console.error('Error generating password:', error);
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
    if (!password) return { strength: 0, label: 'None', color: 'bg-gray-200 dark:bg-gray-600' };

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

    if (score <= 2) return { strength: 25, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { strength: 50, label: 'Fair', color: 'bg-yellow-500' };
    if (score <= 6) return { strength: 75, label: 'Good', color: 'bg-blue-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(generatedPassword);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Generate Password</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
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
                      type={showPassword ? 'text' : 'password'}
                      value={generatedPassword}
                      readOnly
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
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
                  <button
                    onClick={handleCopyPassword}
                    className="p-3 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Password Strength */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Strength</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{strength.label}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.strength}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Password Options */}
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <Settings className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Password Options</h3>
            </div>

            {/* Length Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password Length: {options.length}
              </label>
              <input
                type="range"
                min="8"
                max="128"
                value={options.length}
                onChange={(e) => handleOptionChange('length', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>8</span>
                <span>128</span>
              </div>
            </div>

            {/* Character Type Options */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="include_upper"
                  type="checkbox"
                  checked={options.include_upper}
                  onChange={(e) => handleOptionChange('include_upper', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="include_upper" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Include Uppercase Letters (A-Z)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="include_lower"
                  type="checkbox"
                  checked={options.include_lower}
                  onChange={(e) => handleOptionChange('include_lower', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="include_lower" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Include Lowercase Letters (a-z)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="include_numbers"
                  type="checkbox"
                  checked={options.include_numbers}
                  onChange={(e) => handleOptionChange('include_numbers', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="include_numbers" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Include Numbers (0-9)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="include_symbols"
                  type="checkbox"
                  checked={options.include_symbols}
                  onChange={(e) => handleOptionChange('include_symbols', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="include_symbols" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Include Symbols (!@#$%^&*)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="exclude_similar"
                  type="checkbox"
                  checked={options.exclude_similar}
                  onChange={(e) => handleOptionChange('exclude_similar', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="exclude_similar" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Exclude Similar Characters (il1Lo0O)
                </label>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={generatePassword}
              disabled={loading}
              className="flex items-center px-6 py-3 bg-green-600 dark:bg-green-600 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
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

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Password Tips:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• Use at least 12 characters for better security</li>
              <li>• Include a mix of character types</li>
              <li>• Avoid using personal information</li>
              <li>• Use unique passwords for each account</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}