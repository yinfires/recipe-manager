import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  }, [isLight]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setIsLight(!isLight)}
      title={isLight ? '切换到深色模式' : '切换到浅色模式'}
    >
      {isLight ? '🌙' : '☀️'}
    </button>
  );
}
