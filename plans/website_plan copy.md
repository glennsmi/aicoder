<!-- fe283af8-8c91-459e-b118-73641e08b793 eb8f65b7-f9b7-4e46-911f-c8900f852b8f -->
# Marketing Website for Cursor Costs

## Architecture Overview

Build a modern marketing website that:

- **Shares Firebase authentication** with the main application
- **Fully responsive** with mobile-first design
- **Light/Dark mode** with system preference detection
- **Tailwind CSS v4** + **shadcn/ui** components
- **Separate deployment** on Firebase Hosting (e.g., cursorcosts.com)
- **Seamless handoff** to the app (app.cursorcosts.com)

## Project Structure

```
cursor_costs/
├── website/                      # NEW: Marketing website
│   ├── public/
│   │   ├── images/
│   │   └── logos/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Navigation.tsx
│   │   │   │   └── MobileMenu.tsx
│   │   │   ├── sections/
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── Features.tsx
│   │   │   │   ├── Pricing.tsx
│   │   │   │   ├── Testimonials.tsx
│   │   │   │   ├── FAQ.tsx
│   │   │   │   └── CTA.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── FeaturesPage.tsx
│   │   │   ├── PricingPage.tsx
│   │   │   ├── AboutPage.tsx
│   │   │   ├── BlogPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── SignupPage.tsx
│   │   ├── contexts/
│   │   │   ├── ThemeContext.tsx
│   │   │   └── AuthContext.tsx   # Shared with main app
│   │   ├── config/
│   │   │   └── firebase.ts        # Same config as main app
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── components.json            # shadcn/ui config
│
├── frontend/                      # Existing app (stays as is)
├── functions/
└── shared/
```

## Phase 1: Website Foundation Setup

### 1.1 Initialize Website Project

Create new Vite + React + TypeScript project:

```bash
cd cursor_costs
npm create vite@latest website -- --template react-ts
cd website
npm install
```

### 1.2 Install Dependencies

```bash
# Core dependencies
npm install react-router-dom firebase

# Tailwind CSS v4
npm install tailwindcss@next @tailwindcss/vite@next

# shadcn/ui setup
npx shadcn-ui@latest init

# Additional utilities
npm install clsx tailwind-merge
npm install -D @types/node
```

### 1.3 Configure Tailwind CSS v4

`website/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
})
```

### 1.4 Setup shadcn/ui

Run initialization and install core components:

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add navigation-menu
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add accordion
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add badge
```

## Phase 2: Shared Firebase Configuration

### 2.1 Share Firebase Config

Create `website/src/config/firebase.ts` (symlink or copy from frontend):

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: "cursorcosts.firebaseapp.com",
  projectId: "cursorcosts",
  storageBucket: "cursorcosts.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
```

### 2.2 Shared Auth Context

Create `website/src/contexts/AuthContext.tsx` (shared logic with main app):

```typescript
// Same authentication logic as frontend/src/contexts/AuthContext.tsx
// On successful login/signup, redirect to app.cursorcosts.com
```

## Phase 3: Theme System

### 3.1 Theme Context

`website/src/contexts/ThemeContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

// Detect system preference
// Store user preference in localStorage
// Apply theme to document root
```

### 3.2 Tailwind Dark Mode Configuration

`website/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          // ... Fueld brand colors
          500: '#97D700',
          900: '#0A2E36',
        },
        secondary: {
          800: '#0A2E36', // Midnight Green
        }
      }
    }
  }
}
```

## Phase 4: Layout Components

### 4.1 Header Component

`website/src/components/layout/Header.tsx`:

Features:

- Logo (links to home)
- Desktop navigation menu
- Mobile hamburger menu trigger
- Theme toggle
- Login/Signup CTAs (or user menu if logged in)
- Sticky on scroll
- Transparent on hero, solid on scroll

### 4.2 Navigation Component

`website/src/components/layout/Navigation.tsx`:

Desktop navigation:

- Home
- Features
- Pricing
- About
- Blog
- Docs (future)

### 4.3 Mobile Menu

`website/src/components/layout/MobileMenu.tsx`:

Using shadcn/ui `Sheet`:

- Slide-in from right
- Full navigation links
- Theme toggle
- Login/Signup buttons
- Social links

### 4.4 Footer Component

`website/src/components/layout/Footer.tsx`:

Sections:

- Product (Features, Pricing, Integrations)
- Company (About, Blog, Careers)
- Resources (Docs, Help Center, Status)
- Legal (Privacy, Terms, Security)
- Social links
- Newsletter signup
- Fueld AI branding

## Phase 5: Home Page Sections

### 5.1 Hero Section

`website/src/components/sections/Hero.tsx`:

Elements:

- Headline: "Track AI Coding Costs Across Your Entire Team"
- Subheading: "Real-time analytics for Cursor, GitHub Copilot, and more"
- Primary CTA: "Start Free Trial"
- Secondary CTA: "View Demo"
- Hero image/animation: Dashboard preview
- Trust indicators: "Join 1,000+ developers"

### 5.2 Features Section

`website/src/components/sections/Features.tsx`:

Feature grid (3 columns on desktop):

**Team Analytics**

- Icon: Users
- Track usage across your entire organization
- Individual and team breakdowns

**Multi-Platform Support**

- Icon: Plug
- Cursor, GitHub Copilot, Codeium, Tabnine
- Automated API sync

**Cost Optimization**

- Icon: TrendingDown
- Identify expensive patterns
- Budget alerts and forecasting

**Beautiful Dashboards**

- Icon: BarChart
- Real-time usage charts
- Export reports (PDF, CSV, Excel)

**Team Management**

- Icon: Shield
- Role-based access control
- Admin, manager, member roles

**Secure & Compliant**

- Icon: Lock
- Enterprise-grade security
- GDPR compliant

### 5.3 How It Works

Three-step process:

1. **Connect** - Link your AI coding tools
2. **Track** - Automatic daily sync of usage data
3. **Optimize** - Analyze and reduce costs

### 5.4 Pricing Section

`website/src/components/sections/Pricing.tsx`:

Pricing cards with shadcn/ui `Card`:

**Free Individual** - $0/month

- Manual CSV upload
- Single user
- 90-day retention
- Community support

**Paid Individual** - $9/month

- Everything in Free
- API integrations
- 1-year retention
- Priority support

**Team** - $49/month + $12/user

- Everything in Paid
- Up to 50 users
- Team management
- Unlimited retention
- Advanced analytics

**Enterprise** - Custom

- Everything in Team
- Unlimited users
- Custom integrations
- Dedicated support
- SSO & SAML

Toggle: Monthly / Annual (save 20%)

### 5.5 Testimonials Section

`website/src/components/sections/Testimonials.tsx`:

Quote cards:

- Customer photo (or company logo)
- Quote
- Name, title, company
- Rating stars

### 5.6 FAQ Section

`website/src/components/sections/FAQ.tsx`:

Using shadcn/ui `Accordion`:

Common questions:

- How does pricing work?
- Which platforms do you support?
- How secure is my data?
- Can I export my data?
- Do you offer a free trial?
- How does billing work?

### 5.7 Final CTA Section

`website/src/components/sections/CTA.tsx`:

- Headline: "Ready to optimize your AI coding costs?"
- CTA: "Start your free trial"
- Subtext: "No credit card required"

## Phase 6: Additional Pages

### 6.1 Features Page

`website/src/pages/FeaturesPage.tsx`:

Detailed feature showcase:

- Feature hero
- Feature categories
- In-depth explanations
- Screenshots/videos
- Integration showcase

### 6.2 Pricing Page

`website/src/pages/PricingPage.tsx`:

- Pricing comparison table
- Feature comparison matrix
- FAQ specific to pricing
- ROI calculator (interactive)
- Contact sales CTA

### 6.3 About Page

`website/src/pages/AboutPage.tsx`:

- Company story
- Mission statement
- Team (if applicable)
- Values
- Contact information

### 6.4 Blog Page

`website/src/pages/BlogPage.tsx`:

Blog listing:

- Post cards (image, title, excerpt, date, author)
- Categories/tags
- Search
- Pagination
- Recent posts sidebar

Blog post template:

- Hero image
- Title, author, date
- Content (markdown support)
- Share buttons
- Related posts

### 6.5 Login/Signup Pages

`website/src/pages/LoginPage.tsx` & `SignupPage.tsx`:

Using shadcn/ui `Dialog` or dedicated pages:

- Email/password fields
- Google sign-in button
- Form validation
- Error handling
- Redirect to app after successful auth
- "Forgot password" flow

## Phase 7: Responsive Design

### 7.1 Breakpoints

Tailwind default breakpoints:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### 7.2 Mobile-First Components

All components built mobile-first:

- Stack vertically on mobile
- Grid layouts on desktop
- Collapsible navigation
- Touch-friendly buttons (min 44px)
- Readable font sizes (min 16px)

### 7.3 Mobile Menu Implementation

Using shadcn/ui `Sheet`:

```typescript
// Slide-in menu from right
// Backdrop overlay
// Smooth animations
// Accessible (keyboard navigation, focus trap)
```

## Phase 8: Animations & Interactions

### 8.1 Scroll Animations

Using Intersection Observer:

- Fade in on scroll
- Slide in from sides
- Number counters
- Progress indicators

### 8.2 Micro-interactions

- Button hover effects
- Card hover lifts
- Link underline animations
- Loading states
- Success/error feedback

### 8.3 Page Transitions

Using React Router:

- Smooth page transitions
- Loading states
- Error boundaries

## Phase 9: SEO & Performance

### 9.1 Meta Tags

Each page:

- Title tag
- Description meta tag
- Open Graph tags (Facebook)
- Twitter Card tags
- Canonical URLs

### 9.2 Performance Optimization

- Code splitting (React.lazy)
- Image optimization (WebP, lazy loading)
- Font optimization (system fonts + web fonts)
- CSS purging (Tailwind production build)
- Gzip compression
- CDN for static assets

### 9.3 Analytics

Integrate:

- Google Analytics 4
- PostHog (if using)
- Conversion tracking
- Heat maps (Hotjar/Clarity)

## Phase 10: Firebase Hosting Configuration

### 10.1 Update firebase.json

```json
{
  "hosting": [
    {
      "target": "website",
      "public": "website/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "**/*.@(jpg|jpeg|gif|png|webp|svg)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        }
      ]
    },
    {
      "target": "app",
      "public": "frontend/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

### 10.2 Configure Hosting Targets

```bash
firebase target:apply hosting website cursorcosts-website
firebase target:apply hosting app cursorcosts-app

# Deploy website
firebase deploy --only hosting:website

# Deploy app
firebase deploy --only hosting:app
```

### 10.3 Custom Domains

Setup:

- `cursorcosts.com` → website
- `app.cursorcosts.com` → main application
- `www.cursorcosts.com` → redirect to cursorcosts.com

## Phase 11: Content & Copywriting

### 11.1 Marketing Copy

Write compelling copy for:

- Hero headlines
- Feature descriptions
- Value propositions
- CTAs
- Social proof

### 11.2 Blog Content

Initial blog posts:

- "How to Track Your Cursor AI Costs"
- "Team AI Coding: Best Practices"
- "Comparing AI Coding Assistant Costs"
- "Optimizing Your Team's AI Budget"

### 11.3 Help Content

FAQ answers:

- Getting started guide
- API integration guides
- Troubleshooting
- Best practices

## Phase 12: Integration with Main App

### 12.1 Seamless Handoff

After login/signup on website:

```typescript
// Redirect to app with session
window.location.href = 'https://app.cursorcosts.com'
```

### 12.2 Shared Session

Firebase auth session shared across:

- cursorcosts.com (website)
- app.cursorcosts.com (application)

### 12.3 Return to Website

Link back to website from app:

- "About" page
- "Pricing" page (for upgrades)
- "Help" links

## Implementation Timeline

### Week 1: Foundation

- Project setup
- Tailwind + shadcn/ui configuration
- Theme system
- Basic routing
- Layout components (Header, Footer, Navigation)

### Week 2: Home Page

- Hero section
- Features section
- How it works
- Pricing preview
- Testimonials
- FAQ
- CTA sections

### Week 3: Additional Pages

- Features page (detailed)
- Pricing page (full)
- About page
- Blog structure
- Login/Signup integration

### Week 4: Polish & Deploy

- Responsive testing (all devices)
- Performance optimization
- SEO implementation
- Analytics setup
- Firebase Hosting deployment
- Custom domain configuration

## Key Components to Build

### Layout Components

- `Header.tsx` - Main navigation header
- `Footer.tsx` - Site footer
- `Navigation.tsx` - Desktop nav menu
- `MobileMenu.tsx` - Mobile slide-out menu
- `ThemeToggle.tsx` - Light/dark mode switch

### Section Components

- `Hero.tsx` - Hero section with CTA
- `Features.tsx` - Feature grid
- `HowItWorks.tsx` - Process steps
- `Pricing.tsx` - Pricing cards
- `Testimonials.tsx` - Customer quotes
- `FAQ.tsx` - Accordion FAQ
- `CTA.tsx` - Call-to-action section

### Page Components

- `HomePage.tsx` - Landing page
- `FeaturesPage.tsx` - Detailed features
- `PricingPage.tsx` - Full pricing page
- `AboutPage.tsx` - About company
- `BlogPage.tsx` - Blog listing
- `BlogPostPage.tsx` - Individual post
- `LoginPage.tsx` - Login form
- `SignupPage.tsx` - Signup form

### Utility Components

- `Container.tsx` - Content container
- `Section.tsx` - Section wrapper
- `GradientBackground.tsx` - Decorative gradients
- `AnimatedSection.tsx` - Scroll animations

## Design System

### Colors

```css
/* Light Mode */
--background: white
--foreground: #0A2E36
--primary: #97D700
--secondary: #0A2E36
--accent: #F75C03

/* Dark Mode */
--background: #0A2E36
--foreground: white
--primary: #97D700
--secondary: #1e3a40
--accent: #F75C03
```

### Typography

```css
/* Headings */
h1: text-5xl md:text-6xl font-bold
h2: text-4xl md:text-5xl font-bold
h3: text-3xl md:text-4xl font-semibold
h4: text-2xl md:text-3xl font-semibold

/* Body */
p: text-base md:text-lg
small: text-sm
```

### Spacing

Consistent padding/margin:

- Section padding: py-16 md:py-24
- Container max-width: max-w-7xl
- Grid gaps: gap-8 md:gap-12

## Build Scripts

Update root `package.json`:

```json
{
  "scripts": {
    "dev:website": "npm run dev --workspace=website",
    "build:website": "npm run build --workspace=website",
    "deploy:website": "npm run build:website && firebase deploy --only hosting:website",
    "deploy:app": "npm run build --workspace=frontend && firebase deploy --only hosting:app",
    "deploy:all": "npm run build:website && npm run build --workspace=frontend && firebase deploy --only hosting"
  }
}
```

## Testing Checklist

### Responsive Testing

- [ ] Mobile (375px, 414px)
- [ ] Tablet (768px, 1024px)
- [ ] Desktop (1280px, 1920px)
- [ ] Navigation works on all sizes
- [ ] Images scale properly
- [ ] Text readable on all sizes

### Cross-Browser Testing

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Safari
- [ ] Mobile Chrome

### Theme Testing

- [ ] Light mode displays correctly
- [ ] Dark mode displays correctly
- [ ] System preference detection works
- [ ] Theme persists across pages
- [ ] Theme toggle works smoothly

### Performance Testing

- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Cumulative Layout Shift < 0.1
- [ ] All images optimized

### SEO Testing

- [ ] All pages have unique titles
- [ ] All pages have meta descriptions
- [ ] Open Graph tags present
- [ ] Twitter Card tags present
- [ ] Sitemap.xml generated
- [ ] Robots.txt configured

## Future Enhancements

- Customer portal (self-serve billing)
- Interactive product demos
- Video content
- Case studies
- Partner integrations page
- API documentation site
- Status page
- Changelog
- Community forum
- Resource library (templates, guides)
- Webinars/events page

### To-dos

- [ ] Design and implement Firestore collections for organizations, teams, members, and API connections with proper indexing
- [ ] Create shared TypeScript types and Zod schemas for organizations, teams, billing, and API connectors
- [ ] Update Firestore security rules to support multi-tenant organization-based access control
- [ ] Implement OrganizationContext for frontend state management of org data, roles, and permissions
- [ ] Enhance authentication flow to handle organization invitations and tier assignment
- [ ] Build invitation system: backend functions, email templates, and acceptance flow
- [ ] Create organization setup wizard for new team/enterprise account creation
- [ ] Implement role-based access control system with permission checking utilities
- [ ] Integrate Stripe for subscription management, webhooks, and billing dashboard
- [ ] Implement pricing tier enforcement and feature gating across the application
- [ ] Build team management interface: create teams, assign managers, add members
- [ ] Create user management interface for admins to invite, suspend, and manage org users
- [ ] Design and implement base API connector framework with authentication and sync logic
- [ ] Implement Cursor API connector with authentication and usage data fetching
- [ ] Implement GitHub Copilot API connector for enterprise usage data
- [ ] Create Cloud Function scheduler for automated daily API syncs
- [ ] Build API connection management interface for admins to configure integrations
- [ ] Create organization dashboard with org-wide usage analytics and user breakdowns
- [ ] Build team analytics views for team managers with member breakdowns
- [ ] Implement export functionality for PDF/CSV/Excel reports with scheduling
- [ ] Create migration script to convert existing users to FREE_INDIVIDUAL tier with personal orgs
- [ ] Update navigation structure with role-based menu items and routing
- [ ] Refactor existing components (CursorUsageChart, CSVImport) for org awareness and filtering
- [ ] Implement additional API connectors: Codeium, Claude Code, OpenAI, Tabnine