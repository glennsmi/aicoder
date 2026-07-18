# AI Coder Marketing Website

Marketing website for AI Coder built with Vite, React, TypeScript, Tailwind CSS v4.

## Tech Stack

- **Framework:** Vite + React + TypeScript
- **Styling:** Tailwind CSS v4 with dark mode support
- **Authentication:** Firebase Auth (shared with main app)
- **Routing:** React Router
- **Components:** Custom components + future shadcn/ui integration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
# Copy .env.example to .env.local
cp .env.example .env.local

# Edit .env.local with your values:
# For local development:
VITE_APP_URL=http://localhost:5173

# For production:
# VITE_APP_URL=https://app.aicoder.guru
```

**Note:** The `VITE_APP_URL` should point to where your main frontend app is running. In local development, this is typically `http://localhost:5173`. In production, it should be `https://app.aicoder.guru`.

3. Run development server:
```bash
npm run dev
```

## Project Structure

```
website/
├── public/
│   ├── logos/          # Fueld/AI Coder logos
│   └── images/         # Marketing images
├── src/
│   ├── components/
│   │   ├── layout/     # Header, Footer, Navigation
│   │   ├── sections/   # Hero, Features, Pricing, etc.
│   │   └── ui/         # Reusable UI components
│   ├── pages/          # Page components
│   ├── contexts/       # Theme, Auth contexts
│   ├── config/         # Firebase config
│   └── lib/            # Utilities
├── tailwind.config.js
└── vite.config.ts
```

## Features

- ✅ Tailwind CSS v4 with custom brand colors
- ✅ Dark/Light/System theme support
- ✅ Firebase authentication (shared with app)
- ✅ TypeScript path aliases (@/, @shared/)
- 🚧 Responsive navigation (in progress)
- 🚧 Homepage sections (in progress)
- 🚧 Additional pages (in progress)

## Next Steps

1. Build layout components (Header, Footer, Navigation, MobileMenu)
2. Create homepage sections (Hero, Features, Pricing, Testimonials, FAQ, CTA)
3. Build additional pages (Features, Pricing, About, Blog)
4. Setup React Router with all routes
5. Configure Firebase Hosting for multi-site deployment (website + app)

## Deployment

The website will be deployed to Firebase Hosting alongside the main app:
- Website: `aicoder.guru` or `www.aicoder.guru`
- App: `app.aicoder.guru`

## Brand Colors

- **Primary Green:** #97D700 (Fueld brand color)
- **Secondary/Midnight Green:** #0A2E36
- **Accent Orange:** #F75C03
- **Gunmetal:** Various shades for text and backgrounds

## Development

This website shares Firebase authentication with the main app, allowing seamless user experiences. After login/signup on the website, users are automatically redirected to the main application.
