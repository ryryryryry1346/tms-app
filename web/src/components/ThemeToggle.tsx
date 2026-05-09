import { LaptopMinimal, MoonStar, SunMedium } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { preference, resolvedTheme, setPreference } = useTheme()

  const options: Array<{
    value: 'light' | 'dark' | 'system'
    label: string
    icon: ReactNode
  }> = [
    {
      value: 'light',
      label: 'Light',
      icon: <SunMedium size={14} strokeWidth={2} />,
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <MoonStar size={14} strokeWidth={2} />,
    },
    {
      value: 'system',
      label: 'System',
      icon: <LaptopMinimal size={14} strokeWidth={2} />,
    },
  ]

  return (
    <div className="app-theme-switcher">
      <div className="app-theme-switcher__status">
        <span className="app-theme-switcher__icon">
          {resolvedTheme === 'dark' ? (
            <MoonStar size={14} strokeWidth={2} />
          ) : (
            <SunMedium size={14} strokeWidth={2} />
          )}
        </span>
        <span>
          {preference === 'system'
            ? `System · ${resolvedTheme === 'dark' ? 'Dark' : 'Light'}`
            : resolvedTheme === 'dark'
              ? 'Dark mode'
              : 'Light mode'}
        </span>
      </div>
      <div
        className="app-theme-switcher__segmented"
        role="tablist"
        aria-label="Theme preference"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={preference === option.value}
            className={`app-theme-switcher__button ${
              preference === option.value ? 'is-active' : ''
            }`}
            onClick={() => setPreference(option.value)}
          >
            <span className="app-theme-switcher__option">
              {option.icon}
              <span>{option.label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
