# Linear x Vercel TMS Design System

## 1. Design Philosophy

This product should feel like a serious work surface for execution, tracking, and review.

The base personality comes from Linear:
- compact
- product-dense
- keyboard-minded
- structured around navigation and lists
- quiet, technical, and operational

The polish comes from Vercel:
- restrained
- typographically precise
- whitespace-disciplined
- visually crisp
- minimal in decoration

The result should feel like:
- a professional TMS workspace
- not a marketing dashboard
- not a consumer SaaS app
- not a dribbble-style card collage

Interaction philosophy:
- hierarchy comes from layout, contrast, and spacing
- not from large visuals or decorative styling
- surfaces should feel organized and layered
- controls should feel compact and intentional
- lists, tables, and side navigation are the dominant product grammar

Density philosophy:
- default density is compact
- whitespace is used to separate systems, not to create spectacle
- primary screens should show a lot of useful information without feeling cramped

## 2. Theme System

Both themes are first-class.

Dark mode uses Linear as the primary source:
- dark canvas
- charcoal surfaces
- hairline borders
- lavender-blue accent restraint

Light mode is derived conservatively from:
- Linear inverse surfaces
- Vercel white canvas
- Vercel neutral text and shadow-as-border treatment

Light mode must still feel like enterprise product software:
- softened whites
- subtle surface separation
- conservative shadows
- strong structure

### Theme tokens

Use semantic tokens only. No component may hardcode light or dark colors.

### Backgrounds

- `--background`
- `--surface`
- `--elevated-surface`
- `--sidebar`
- `--card`
- `--muted-surface`

### Borders

- `--border-default`
- `--border-subtle`
- `--border-focus`

### Typography

- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--text-inverse`

### States

- `--state-hover`
- `--state-active`
- `--state-selected`
- `--state-focus`
- `--state-disabled`

### Status

- `--status-success`
- `--status-warning`
- `--status-error`
- `--status-info`

### Theme values

#### Dark

Dark theme uses these source values from Linear:
- canvas: `#010102`
- surface-1: `#0f1011`
- surface-2: `#141516`
- surface-3: `#18191a`
- surface-4: `#191a1b`
- hairline: `#23252a`
- hairline-strong: `#34343a`
- ink: `#f7f8f8`
- ink-muted: `#d0d6e0`
- ink-subtle: `#8a8f98`
- ink-tertiary: `#62666d`
- primary: `#5e6ad2`
- primary-hover: `#828fff`
- primary-focus: `#5e69d1`
- semantic-success: `#27a644`

Dark token mapping:
- `--background: #010102`
- `--surface: #0f1011`
- `--elevated-surface: #141516`
- `--sidebar: #0b0c0d`
- `--card: #141516`
- `--muted-surface: #18191a`
- `--border-default: #23252a`
- `--border-subtle: #1b1d22`
- `--border-focus: #5e69d1`
- `--text-primary: #f7f8f8`
- `--text-secondary: #d0d6e0`
- `--text-muted: #8a8f98`
- `--text-inverse: #000000`
- `--state-hover: #18191a`
- `--state-active: #191a1b`
- `--state-selected: rgba(94, 106, 210, 0.14)`
- `--state-focus: rgba(94, 105, 209, 0.28)`
- `--state-disabled: #62666d`
- `--status-success: #27a644`
- `--status-warning: #5e6ad2`
- `--status-error: #5e6ad2`
- `--status-info: #5e6ad2`

#### Light

Light theme uses these source values from Vercel and Linear inverse surfaces:
- Vercel black: `#171717`
- white: `#ffffff`
- gray-600: `#4d4d4d`
- gray-500: `#666666`
- gray-400: `#808080`
- gray-100: `#ebebeb`
- gray-50: `#fafafa`
- link blue: `#0072f5`
- badge blue text: `#0068d6`
- badge blue bg: `#ebf5ff`
- Linear inverse surface-1: `#f5f6f6`
- Linear inverse surface-2: `#f6f7f7`

Light token mapping:
- `--background: #f6f7f7`
- `--surface: #ffffff`
- `--elevated-surface: #ffffff`
- `--sidebar: #f5f6f6`
- `--card: #ffffff`
- `--muted-surface: #fafafa`
- `--border-default: #ebebeb`
- `--border-subtle: #ebebeb`
- `--border-focus: #0072f5`
- `--text-primary: #171717`
- `--text-secondary: #4d4d4d`
- `--text-muted: #666666`
- `--text-inverse: #ffffff`
- `--state-hover: #fafafa`
- `--state-active: #f5f6f6`
- `--state-selected: #ebf5ff`
- `--state-focus: rgba(147, 197, 253, 0.5)`
- `--state-disabled: #808080`
- `--status-success: #0068d6`
- `--status-warning: #de1d8d`
- `--status-error: #ff5b4f`
- `--status-info: #0a72ef`

### Theme behavior

- Use stored user preference first.
- If there is no stored preference, use system theme.
- Resolve to `light` or `dark` before hydration to avoid flashing.
- All components consume semantic tokens only.
- Never fork component markup per theme.

### Contrast philosophy

- Dark mode keeps strong contrast between canvas and ink but uses hairline borders instead of bright dividers.
- Light mode keeps surfaces restrained and separated through subtle border and ring treatment, not big shadows.
- Accent color is used sparingly. It should guide action, not paint the interface.

### Accessibility expectations

- Focus must always be visible in both themes.
- Selected states must remain distinguishable without depending only on color.
- Muted text must remain readable against the active surface.
- Interactive hit areas should remain comfortable even in compact mode.

## 3. Typography System

Font family:
- primary: `Geist Sans` or `Geist`
- mono: `Geist Mono`

Reason:
- Vercel provides the cleanest public implementation path
- Geist is also an acceptable substitute for Linear's non-public family

Scale:
- page title: `40px`, `600`, tight tracking
- section title: `24px`, `600`
- panel title: `20px`, `600`
- body: `14px`, `400` or `500`
- meta label: `12px`, `500`
- button text: `14px`, `500`
- sidebar item: `13px`, `500`
- table header: `12px`, `500`
- mono/meta ids: `12px` to `13px`, mono

Rules:
- page titles can use modest negative tracking
- panel and table UI should not use dramatic typography
- labels and technical metadata should feel compact
- avoid heavy `700` weight except where a tiny badge or highly emphasized CTA needs it

## 4. Spacing System

Base scale from Linear:
- `4`
- `8`
- `12`
- `16`
- `24`
- `32`
- `48`

Application rules:
- sidebar item padding: `8px 10px`
- compact toolbar gaps: `8px`
- card/panel body: `16px` or `24px`
- page section gap: `24px`
- outer shell padding desktop: `24px`
- outer shell padding large desktop: `32px`
- mobile shell padding: `16px`

Layout rhythm:
- prefer repeated `16/24/32` beats
- avoid arbitrary one-off spacing values unless required by existing product logic

## 5. Border Radius System

Use conservative product radius values:
- control: `6px`
- card/panel: `8px`
- featured panel or drawer: `12px`
- pill: `9999px`

Do not introduce oversized rounded cards.

## 6. Elevation Rules

Default hierarchy:
- base separation by surface color plus hairline border
- elevated state by slightly lifted surface
- shadows are restrained and mostly used in light mode

Allowed:
- Vercel-style shadow-as-border in light mode
- Linear hairline borders in dark mode
- popovers and drawers may use one stronger elevated shadow

Avoid:
- glassmorphism
- floating marketing-card shadows
- blurred color glows

## 7. Sidebar Rules

Desktop:
- fixed left sidebar
- width: `272px`
- internal padding: `16px`

Structure:
- top: product mark and workspace context
- middle: grouped navigation
- bottom: user, settings, theme switcher

Item rules:
- icon aligned in a fixed slot
- label baseline aligned
- active item uses selected surface, not a loud badge
- hover shifts background one surface step

Collapse behavior:
- no desktop collapse required in first pass
- mobile uses slide-over drawer

Mobile:
- hidden by default
- opened via shell toggle
- closes on route change or backdrop click

## 8. Navigation Rules

- Active route is shown with selected surface plus stronger text.
- Hover uses a nearby surface step, not a new accent color.
- Accent is reserved for current product context, important CTA, or focus treatment.
- Nav groups should be labeled quietly with small meta text.
- Never rely on underlines as the main nav pattern inside the product shell.

## 9. TMS Components

### Workspace shell
- sidebar + top header + main content
- content area should feel like one coherent workspace, not loose pages

### Page header
- title
- short descriptive copy when useful
- contextual actions aligned to the right

### Panels
- operational surfaces, not decorative cards
- dense header/body/footer structure

### Tables and lists
- compact rows
- strong alignment
- subtle separators
- selected row uses selected state token

### Status badges
- pill form
- small
- restrained
- semantic token driven

### Filters and toolbars
- compact
- horizontally grouped
- no oversized inputs

### Forms and editors
- inputs use control radius
- editor toolbars must feel like product controls, not document UI chrome

### Empty states
- short
- helpful
- action oriented
- no oversized illustration-first treatment

## 10. Responsive Rules

Desktop-first.

Breakpoints:
- desktop: full sidebar
- tablet: sidebar remains available, content tightens
- mobile: sidebar becomes drawer

Rules:
- shell header remains usable at all sizes
- top actions may wrap
- sidebar never compresses into unusable mini-icons in first pass
- dense tables may scroll horizontally rather than collapsing into card stacks

## 11. Do / Don't Rules

Do:
- use semantic tokens
- preserve compact density
- keep product hierarchy obvious
- favor lists, panels, and structured surfaces
- keep light and dark themes parallel

Don't:
- add random gradients
- add flashy color accents
- create giant hero-card layouts inside product screens
- use oversized border radii
- add decorative shadows unrelated to hierarchy
- fork components per theme
- introduce new spacing systems
- use generic AI dashboard patterns
