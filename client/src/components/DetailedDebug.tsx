'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme';

export default function DetailedDebug() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [htmlClasses, setHtmlClasses] = useState('');
  const [bodyStyles, setBodyStyles] = useState('');
  const [tailwindWorking, setTailwindWorking] = useState(false);

  useEffect(() => {
    const updateDebugInfo = () => {
      const html = document.documentElement;
      const body = document.body;

      setHtmlClasses(html.className);

      const bodyComputedStyles = window.getComputedStyle(body);
      setBodyStyles(`bg: ${bodyComputedStyles.backgroundColor}, color: ${bodyComputedStyles.color}`);

      // Test if Tailwind classes work
      const testEl = document.createElement('div');
      testEl.className = 'bg-blue-500';
      document.body.appendChild(testEl);
      const testStyles = window.getComputedStyle(testEl);
      setTailwindWorking(testStyles.backgroundColor.includes('59, 130, 246') || testStyles.backgroundColor.includes('rgb(59, 130, 246)'));
      document.body.removeChild(testEl);
    };

    updateDebugInfo();

    const observer = new MutationObserver(updateDebugInfo);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-black text-white p-4 rounded text-xs font-mono z-50 max-w-sm">
      <div className="space-y-2">
        <div className="font-bold">Debug Info:</div>
        <div>Theme: {theme}</div>
        <div>Resolved: {resolvedTheme}</div>
        <div>HTML classes: {htmlClasses || 'none'}</div>
        <div>Body styles: {bodyStyles}</div>
        <div>Tailwind working: {tailwindWorking ? 'Yes' : 'No'}</div>

        <div className="border-t border-gray-500 pt-2 mt-2">
          <div className="font-bold mb-1">Quick Tests:</div>

          {/* Force theme buttons */}
          <div className="space-x-1 mb-2">
            <button
              onClick={() => setTheme('light')}
              className="bg-white text-black px-2 py-1 rounded text-xs"
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className="bg-gray-800 text-white px-2 py-1 rounded text-xs"
            >
              Dark
            </button>
          </div>

          {/* Test elements */}
          <div className="space-y-1">
            <div className="test-card">Custom CSS test</div>
            <div className="bg-white dark:bg-gray-800 text-black dark:text-white p-1 rounded">
              Tailwind test
            </div>
            <div className="bg-blue-500 text-white p-1 rounded">
              Blue test (should always be blue)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}