import { LaptopMinimal, MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { Button } from './ui/Button'
import { SelectMenu } from './ui/SelectMenu'

export default function ThemeToggle() {
  const { preference, resolvedTheme, setPreference } = useTheme()

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
        <span>{resolvedTheme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
      </div>
      <SelectMenu
        value={preference}
        onValueChange={(value) =>
          setPreference(value as 'system' | 'light' | 'dark')
        }
        options={[
          {
            value: 'system',
            label: (
              <span className="app-theme-switcher__option">
                <LaptopMinimal size={14} strokeWidth={2} />
                <span>System</span>
              </span>
            ),
          },
          {
            value: 'light',
            label: (
              <span className="app-theme-switcher__option">
                <SunMedium size={14} strokeWidth={2} />
                <span>Light</span>
              </span>
            ),
          },
          {
            value: 'dark',
            label: (
              <span className="app-theme-switcher__option">
                <MoonStar size={14} strokeWidth={2} />
                <span>Dark</span>
              </span>
            ),
          },
        ]}
        aria-label="Theme preference"
        className="app-theme-switcher__select"
      />
      <Button
        type="button"
        size="sm"
        className="app-theme-switcher__toggle"
        onClick={() => setPreference(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        {resolvedTheme === 'dark' ? 'Use light' : 'Use dark'}
      </Button>
    </div>
  )
}
