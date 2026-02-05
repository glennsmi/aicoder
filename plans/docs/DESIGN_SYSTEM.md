# AICoder.Guru Design System & Brand Guidelines

**Version:** 2.1  
**Last Updated:** October 15, 2025  
**Brand:** AICoder.Guru - AI Coding Analytics Platform  
**Tagline:** "Measure. Motivate. Master AI."

## 🎯 App UI Theme (Updated)

### Sidebar (Navigation)
The sidebar maintains a **consistent dark midnight green theme** in both light and dark modes for a professional, focused appearance:

**Colors:**
- Background: `secondary-900` (#08242c) - Dark midnight green
- Borders: `secondary-700` (#0d3844)
- Text: `white` / `white/80` for inactive items
- Active item background: `accent-400` (#64BFA4) - Jade green
- Active item text: `neutral-900` (#0F1A1C) - Dark text
- Hover: `secondary-800` (#0a2e38)

**User Menu Dropdown:**
- Background: `secondary-950` (#051a20) - Darkest midnight
- Border: `accent-400` (#64BFA4) - 2px jade green border
- Text: White throughout
- Logout button: `text-red-400` with `hover:bg-red-900/20`

### Main Content Area
**Light Mode:**
- Background: `gray-50` (#F8FAFA)
- Cards: `white` with `border-gray-200`
- Text: `neutral-900` (#0F1A1C)
- Secondary text: `neutral-500` (#6B7D82)

**Dark Mode:**
- Background: `gray-900` (#0F1A1C)
- Cards: `gray-800` with `border-gray-700`
- Text: `white`
- Secondary text: `gray-400`

---

## 🎨 Brand Identity

### Logo System

We use the **AI Coder Guru** logo set with the guru symbol as our primary brand mark.

#### Primary Logos (Source: `/Public/Logo/`)

**Full Logos:**
- `Full logo 2910X634 Midnight no background.png` - For light backgrounds
- `Full logo 2910X634 Sand no background.png` - For dark backgrounds
- `Full logo 3600x900.svg` - Scalable vector (default)
- `Full logo 3600x900 sand.svg` - Scalable vector (sand variant)

**Symbol/Icon:**
- `AI Coder Guru Symbol.svg` - Primary icon (2-color: Midnight + Jade)
- `Jade AI Coder Guru Symbol.svg` - Single-color jade variant
- `AI Coder Guru Symbol.png` - Raster version

#### Website Logo Locations

**Deployed to:** `/Users/glennsmith/coding/aicoder/website/public/logos/`

Current mapping:
```
logo-light.png  → Full logo 2910X634 Midnight no background.png
logo-dark.png   → Full logo 2910X634 Sand no background.png
jade-guru.svg   → Jade AI Coder Guru Symbol.svg (icon for checkmarks)
orange-guru.svg → AI Coder Guru Symbol.svg (icon variant)
```

**Recommended Updates:**
```bash
# Copy source logos to website
cp "/Public/Logo/Full logo 2910X634 Midnight no background.png" website/public/logos/logo-light.png
cp "/Public/Logo/Full logo 2910X634 Sand no background.png" website/public/logos/logo-dark.png
cp "/Public/Logo/Jade AI Coder Guru Symbol.svg" website/public/logos/jade-guru.svg
cp "/Public/Logo/AI Coder Guru Symbol.svg" website/public/logos/guru-symbol.svg
cp "/Public/Logo/AI Coder Guru Symbol.png" website/public/favicon.png
```

### Logo Usage Guidelines

#### Header Logo
- **Light Mode:** `logo-light.png` (Midnight on transparent)
- **Dark Mode:** `logo-dark.png` (Sand on transparent)
- **Height:** 48px (`h-12` in Tailwind)
- **Hover:** Scale to 105% (`group-hover:scale-105`)

**Implementation:**
```tsx
<img
  src={actualTheme === 'dark' ? '/logos/logo-dark.png' : '/logos/logo-light.png'}
  alt="AICoder.Guru - Measure. Motivate. Master AI."
  className="h-12 transition-transform group-hover:scale-105"
/>
```

#### Icon Usage
- **Checkmarks/Benefits:** `jade-guru.svg` (Jade variant, 32px)
- **Favicon:** `guru-symbol.svg` or `AI Coder Guru Symbol.png`
- **App Icons:** Use full guru symbol with both colors

**Implementation:**
```tsx
<img 
  src="/logos/jade-guru.svg" 
  alt="Guru" 
  className="w-8 h-8 flex-shrink-0"
/>
```

---

## 🎨 Color Palette

### Primary Colors

#### 1. Orange (Primary - F75C03)
**Purpose:** CTAs, highlights, focus states, energy
**Usage:** Buttons, links, active states, important UI elements

```css
--color-primary-500: #F75C03  /* Main orange */
--color-primary-600: #E54F02  /* Hover state */
--color-primary-400: #ff7d3d  /* Light variant */
```

**Tailwind Classes:**
- `bg-primary-500` - Button backgrounds
- `text-primary-500` - Links, highlights
- `hover:bg-primary-600` - Interactive states
- `border-primary-500` - Borders, outlines

**Use Cases:**
- "Start Free Trial" buttons
- "Get Started" CTAs
- Active navigation items
- Important icons/badges

#### 2. Midnight Green (Secondary - 124C5A)
**Purpose:** Depth, professionalism, dark backgrounds
**Usage:** Dark mode backgrounds, headers, footers

```css
--color-secondary-500: #124C5A  /* Main midnight green */
--color-secondary-900: #08242c  /* Darker variant */
--color-secondary-800: #0a2e38  /* Medium dark */
```

**Tailwind Classes:**
- `bg-secondary-900` - Dark mode body background
- `bg-secondary-800` - Dark mode cards/panels
- `text-secondary-900` - Dark text on light backgrounds
- `border-secondary-700` - Dark borders

**Use Cases:**
- Dark mode primary background
- Footer background (always dark)
- Dark UI elements
- Text on light backgrounds

#### 3. Soft Sand (Sand - F2E8CF)
**Purpose:** Warmth, readability, light backgrounds
**Usage:** Light mode backgrounds, typography on dark

```css
--color-sand-300: #F2E8CF  /* Main sand */
--color-sand-100: #faf6ed  /* Lighter variant */
--color-sand-200: #f7f1e0  /* Light cards */
```

**Tailwind Classes:**
- `bg-sand-300` - Light mode body background
- `bg-sand-100` - Light mode cards
- `text-sand-300` - Light text on dark backgrounds
- `bg-sand-50` - Very light sections

**Use Cases:**
- Light mode primary background
- Light mode section backgrounds
- Text on dark mode
- Subtle highlights

#### 4. Soft Jade Green (Accent - 64BFA4)
**Purpose:** Freshness, success, complementary highlights
**Usage:** Success states, icons, accent elements

```css
--color-accent-400: #64BFA4  /* Main jade green */
--color-accent-500: #4eab90  /* Darker variant */
--color-accent-600: #3d8a75  /* Even darker */
```

**Tailwind Classes:**
- `bg-accent-400` - Icon backgrounds, badges
- `text-accent-400` - Accent text
- `hover:text-accent-500` - Hover states
- `border-accent-400` - Accent borders

**Use Cases:**
- Guru symbol icon (jade variant)
- "Most Popular" pricing badge
- Success messages
- Checkmark icons
- Complementary UI elements

### Neutral Palette

For UI elements, borders, and text:

```css
--color-neutral-50: #F8FAFA    /* Lightest */
--color-neutral-200: #D7DFE2   /* Light borders */
--color-neutral-500: #6B7D82   /* Medium gray */
--color-neutral-700: #243338   /* Dark gray text */
--color-neutral-900: #0F1A1C   /* Darkest text */
```

**Tailwind Classes:**
- `text-neutral-900` - Primary text (light mode)
- `text-neutral-700` - Secondary text (light mode)
- `text-neutral-500` - Muted text
- `border-neutral-200` - Light borders
- `bg-neutral-50` - Light backgrounds

---

## 📐 Typography

### Font Family
**Primary:** Inter (sans-serif)
**Fallback:** system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Font Scales

#### Headings
```
H1: 4xl-6xl (36-60px)  - Hero headlines
H2: 4xl-5xl (36-48px)  - Section headings
H3: 3xl (30px)         - Subsection headings
H4: 2xl (24px)         - Card headings
H5: xl (20px)          - Small headings
H6: lg (18px)          - Micro headings
```

**Implementation:**
```tsx
<h1 className="text-5xl md:text-6xl font-bold">
  Headline
</h1>

<h2 className="text-4xl md:text-5xl font-bold mb-4">
  Section Title
</h2>

<h3 className="text-3xl font-bold">
  Subsection
</h3>
```

#### Body Text
```
Large:   xl (20px)  - Lead paragraphs
Default: base (16px) - Body text
Small:   sm (14px)  - Captions, labels
Tiny:    xs (12px)  - Fine print
```

**Implementation:**
```tsx
<p className="text-xl text-neutral-700 dark:text-sand-300">
  Lead paragraph
</p>

<p className="text-sm text-neutral-700 dark:text-neutral-500">
  Caption text
</p>
```

### Font Weights
- **Bold (700):** Headlines, CTAs
- **Semibold (600):** Subheadings, button text
- **Medium (500):** Navigation, labels
- **Regular (400):** Body text

---

## 🧩 Component Library

### Buttons

#### Primary CTA
```tsx
<a
  href="/signup"
  className="px-8 py-4 bg-primary-500 text-secondary-900 text-lg font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-lg hover:shadow-xl"
>
  Start Free Trial
</a>
```

**Variants:**
- **Primary:** `bg-primary-500 text-secondary-900`
- **Secondary:** `bg-secondary-800 text-sand-300`
- **Accent:** `bg-accent-400 text-secondary-900`
- **Outline:** `border-2 border-primary-500 text-primary-500`

#### Button Sizes
- **Large:** `px-8 py-4 text-lg` - Hero CTAs
- **Medium:** `px-6 py-3 text-base` - Standard buttons
- **Small:** `px-4 py-2 text-sm` - Compact buttons

### Cards

#### Light Mode Card
```tsx
<div className="bg-sand-100 dark:bg-secondary-800 rounded-xl p-6 shadow-md border border-neutral-200 dark:border-neutral-700">
  {/* Content */}
</div>
```

#### Pricing Card
```tsx
<div className="bg-sand-100 dark:bg-secondary-800 rounded-xl p-6 border-2 border-neutral-200 dark:border-neutral-700 hover:border-primary-500 hover:shadow-lg transition-all">
  {/* Pricing content */}
</div>
```

#### Highlighted Card (Most Popular)
```tsx
<div className="relative bg-sand-100 dark:bg-secondary-800 rounded-xl p-6 border-2 border-primary-500 shadow-xl">
  <div className="absolute -top-3 left-0 right-0 flex justify-center">
    <span className="px-3 py-1 bg-accent-400 text-secondary-900 text-xs font-semibold rounded-full">
      Most Popular
    </span>
  </div>
  {/* Content */}
</div>
```

### Navigation

#### Header
```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-sand-300/95 dark:bg-secondary-900/95 backdrop-blur-sm shadow-md">
  <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo, Nav, Actions */}
    </div>
  </nav>
</header>
```

#### Navigation Links
```tsx
<a
  href="/features"
  className="text-neutral-700 dark:text-sand-300 hover:text-accent-500 dark:hover:text-accent-400 font-medium transition-colors"
>
  Features
</a>
```

### Icons & Symbols

#### Checkmark (Using Guru Symbol)
```tsx
<div className="flex items-center gap-3">
  <img 
    src="/logos/jade-guru.svg" 
    alt="Guru" 
    className="w-8 h-8 flex-shrink-0"
  />
  <span>Benefit text</span>
</div>
```

#### SVG Icons
```tsx
<svg className="w-6 h-6 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
</svg>
```

---

## 🌓 Dark Mode Strategy

### Implementation
- **Method:** Class-based (`dark` class on `<html>`)
- **Detection:** System preference with manual toggle
- **Storage:** localStorage (`theme` key)

### Dark Mode Colors
```tsx
// Background
bg-sand-300 dark:bg-secondary-900

// Cards
bg-sand-100 dark:bg-secondary-800

// Text
text-neutral-900 dark:text-white
text-neutral-700 dark:text-sand-300
text-neutral-500 dark:text-neutral-500

// Borders
border-neutral-200 dark:border-neutral-700

// Interactive
hover:bg-neutral-50 dark:hover:bg-neutral-700
```

### Theme Toggle Component
```tsx
<button
  onClick={toggleTheme}
  className="p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
  aria-label="Toggle theme"
>
  {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
</button>
```

---

## 📱 Responsive Design

### Breakpoints (Tailwind defaults)
```
sm:  640px  - Mobile landscape
md:  768px  - Tablet
lg:  1024px - Desktop
xl:  1280px - Large desktop
2xl: 1536px - Extra large
```

### Mobile-First Approach
```tsx
// Mobile: Stack vertically
// Desktop: 2 columns
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
  {/* Content */}
</div>

// Mobile: Full width
// Desktop: Fixed max width
<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
  {/* Content */}
</div>
```

### Typography Scaling
```tsx
// Responsive heading
<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
  Headline
</h1>

// Responsive body
<p className="text-base md:text-lg lg:text-xl">
  Paragraph
</p>
```

---

## 🎯 Page Layouts

### Homepage Hero
```tsx
<section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-sand-300 via-primary-50/30 to-sand-300 dark:from-secondary-900 dark:via-secondary-800/50 dark:to-secondary-900">
  <div className="container mx-auto max-w-7xl grid md:grid-cols-2 gap-12 items-center">
    <div className="text-center md:text-left">
      {/* Headline, CTA */}
    </div>
    <div>
      {/* Visual / Chart */}
    </div>
  </div>
</section>
```

### Features Section
```tsx
<section className="py-20 px-4 sm:px-6 lg:px-8 bg-sand-50 dark:bg-secondary-950">
  <div className="container mx-auto max-w-7xl">
    <div className="text-center mb-16">
      {/* Section header */}
    </div>
    <div className="grid md:grid-cols-2 gap-12">
      {/* Feature cards */}
    </div>
  </div>
</section>
```

### Pricing Grid
```tsx
<section className="py-20 px-4 sm:px-6 lg:px-8 bg-sand-300 dark:bg-secondary-900">
  <div className="container mx-auto max-w-7xl">
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Pricing cards */}
    </div>
  </div>
</section>
```

### Footer
```tsx
<footer className="bg-secondary-900 text-sand-300 border-t border-secondary-700">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div className="grid md:grid-cols-4 gap-8">
      {/* Logo, Product, Company, Legal columns */}
    </div>
  </div>
</footer>
```

---

## 🖼️ Image Assets

### Required Image Sizes

#### Logo Files
```
Header Logo (Light): 2910x634px PNG
Header Logo (Dark):  2910x634px PNG
Symbol/Icon:        485x634px SVG
Favicon:            32x32px PNG or SVG
```

#### Screenshots/Charts
```
Feature Images:  1200x800px
Chart Examples:  800x600px
Hero Visual:     1200x900px
```

### Image Optimization
- **Format:** WebP with PNG fallback
- **Lazy Loading:** `loading="lazy"` attribute
- **Responsive:** Use `srcset` for different sizes

```tsx
<img 
  src="/images/feature.webp" 
  srcSet="/images/feature-sm.webp 640w, /images/feature-md.webp 1024w, /images/feature-lg.webp 1920w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt="Feature description"
  loading="lazy"
  className="w-full h-auto rounded-xl"
/>
```

---

## ✨ Animations & Transitions

### Standard Transitions
```css
transition-colors    - Color changes (200ms)
transition-all       - All properties (200ms)
transition-transform - Transforms (300ms)
```

### Hover Effects
```tsx
// Button hover
hover:bg-primary-600 transition-colors

// Card hover
hover:shadow-xl transition-all duration-300

// Link hover
hover:text-accent-500 transition-colors

// Image hover
group-hover:scale-105 transition-transform
```

### Scroll Animations
```css
scroll-behavior: smooth  /* Enable smooth scrolling */
```

---

## 📋 Content Guidelines

### Voice & Tone
- **Professional but approachable**
- **Technical but clear**
- **Confident without arrogance**
- **Helpful and educational**

### Key Messages
1. **Tagline:** "Measure. Motivate. Master AI."
2. **Core Value:** Simple, real-time visibility into AI coding tool usage
3. **Target Audience:** Managers of development teams wanting to increase AI adoption
4. **Key Benefits:**
   - Track AI usage across your team
   - Understand costs and ROI
   - Motivate adoption through visibility
   - Make data-driven decisions

### CTA Hierarchy
1. **Primary:** "Start Free Trial" / "Get Started for Free"
2. **Secondary:** "View Pricing" / "See Features"
3. **Tertiary:** "Learn More" / "Contact Sales"

---

## 🔧 Implementation Checklist

### Logo Migration
- [ ] Copy all AI Coder Guru logos from `/Public/Logo/` to `/website/public/logos/`
- [ ] Update Header component to use new logo files
- [ ] Update favicon to use guru symbol
- [ ] Replace jade-guru.svg with latest version
- [ ] Remove old Fueld branding files

### Color Updates
- [x] Tailwind CSS v4 theme configured with new palette
- [x] Primary orange (#F75C03) implemented
- [x] Secondary midnight green (#124C5A) implemented
- [x] Sand (#F2E8CF) implemented
- [x] Accent jade green (#64BFA4) implemented
- [x] Dark mode fully configured

### Component Updates
- [ ] Update all buttons to use new color scheme
- [ ] Update all cards to use new backgrounds
- [ ] Update all text colors to use neutral palette
- [ ] Replace checkmark icons with jade-guru.svg
- [ ] Update "Most Popular" badge to use accent color

### Page Updates
- [ ] Homepage hero section
- [ ] Features page
- [ ] Pricing page
- [ ] FAQ page
- [ ] About page
- [ ] Legal pages (Privacy, Terms, etc.)

### Testing
- [ ] Test light mode across all pages
- [ ] Test dark mode across all pages
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test logo visibility on all backgrounds
- [ ] Test CTA button contrast
- [ ] Test accessibility (WCAG AA compliance)

---

## 📚 Additional Resources

### Design Files Location
- Source Logos: `/Public/Logo/`
- Website Assets: `/website/public/`
- Tailwind Config: `/website/src/index.css`

### Documentation
- Design System: `/plans/docs/DESIGN_SYSTEM.md` (this file)
- Hosting Strategy: `/plans/docs/HOSTING_STRATEGY.md`
- App Structure: `/plans/docs/APP_STRUCTURE_RESTORED.md`

### External References
- Tailwind CSS v4: https://tailwindcss.com
- React: https://react.dev
- Vite: https://vitejs.dev
- Firebase Hosting: https://firebase.google.com/docs/hosting

---

**Last Updated:** October 15, 2025  
**Maintained By:** AICoder.Guru Team  
**Version:** 2.0 (New AI Guru Branding)

