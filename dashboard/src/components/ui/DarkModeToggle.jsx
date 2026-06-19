// src/components/ui/DarkModeToggle.jsx
import { Sun, Moon } from 'lucide-react'
import { useThemeContext } from '../../context/ThemeContext'

export function DarkModeToggle() {
  const { theme, toggleTheme } = useThemeContext()
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      className='dark-mode-toggle flex items-center gap-1.5 px-2.5 py-1.5'
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}