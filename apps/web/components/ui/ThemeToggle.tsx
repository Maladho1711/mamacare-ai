'use client';

import { useTheme } from '@/components/ui/ThemeProvider';

// ─── Icônes inline (pas de dépendance externe) ────────────────────────────────

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme();

  // Cycle : light → dark → system → light
  function cycle() {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  }

  const label =
    theme === 'light' ? 'Mode clair — basculer vers mode sombre' :
    theme === 'dark'  ? 'Mode sombre — basculer vers mode auto' :
    'Mode auto — basculer vers mode clair';

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className="
        p-2 rounded-lg transition-colors
        text-gray-400 hover:text-gray-700 hover:bg-gray-100
        dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:ring-offset-1
        dark:focus:ring-offset-gray-900
      "
    >
      {theme === 'light' ? <SunIcon /> : theme === 'dark' ? <MoonIcon /> : <SystemIcon />}
    </button>
  );
}
