// src/components/ui/DarkModeToggle.jsx
import { Sun, Moon } from 'lucide-react'
import { useThemeContext } from '../../context/ThemeContext'

export function DarkModeToggle() {
  const { theme, toggleTheme } = useThemeContext()
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '6px 10px',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}