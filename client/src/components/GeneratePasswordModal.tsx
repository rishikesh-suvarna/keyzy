/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { X, Copy, RefreshCw, Settings, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface GeneratePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePassword?: (password: string) => void;
}

export default function GeneratePasswordModal({
  isOpen,
  onClose,
  onSavePassword,
}: GeneratePasswordModalProps) {
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({
    length: 16,
    include_upper: true,
    include_lower: true,
    include_numbers: true,
    include_symbols: false,
    exclude_similar: true,
  });

  const generatePassword = async () => {
    if (!options.include_upper && !options.include_lower && !options.include_numbers && !options.include_symbols) {
      toast.error('Please select at least one character type');
      return;
    }

    setLoading(true);
    try {
      // Client-side generation
      let charset = '';
      if (options.include_upper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (options.include_lower) charset += 'abcdefghijklmnopqrstuvwxyz';
      if (options.include_numbers) charset += '0123456789';
      if (options.include_symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

      if (options.exclude_similar) {
        charset = charset.replace(/[il1Lo0O]/g, '');
      }

      let password = '';
      for (let i = 0; i < options.length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }

      setGeneratedPassword(password);
      toast.success('Password generated successfully!');
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

  const handleSavePassword = () => {
    if (!generatedPassword) return;

    if (onSavePassword) {
      onSavePassword(generatedPassword);
      onClose();
    }
  };

  const handleOptionChange = (key: string, value: boolean | number) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: 'None', color: 'bg-gray-300 dark:bg-gray-700' };

    let score = 0;

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-black rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-black dark:text-white">Generate Password</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
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
                      type="text"
                      value={generatedPassword}
                      readOnly
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-black dark:text-white font-mono text-sm"
                    />
                  </div>
                  <button
                    onClick={handleCopyPassword}
                    className="p-3 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {onSavePassword && (
                    <button
                      onClick={handleSavePassword}
                      className="px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:shadow-lg transition-all font-medium"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Password Strength */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Strength</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{strength.label}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
              <h3 className="text-lg font-medium text-black dark:text-white">Password Options</h3>
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
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
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
                  className="h-4 w-4 text-black dark:text-white focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black"
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
                  className="h-4 w-4 text-black dark:text-white focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black"
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
                  className="h-4 w-4 text-black dark:text-white focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black"
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
                  className="h-4 w-4 text-black dark:text-white focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black"
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
                  className="h-4 w-4 text-black dark:text-white focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black"
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
              className="flex items-center px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
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

          {/* Tips */}
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <h4 className="text-sm font-medium text-black dark:text-white mb-2">Password Tips:</h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>• Use at least 12 characters for better security</li>
              <li>• Include a mix of character types</li>
              <li>• Avoid using personal information</li>
              <li>• Use unique passwords for each account</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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