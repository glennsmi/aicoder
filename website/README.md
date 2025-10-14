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
# Copy from main app's frontend/.env.local
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=aicoder-guru.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=aicoder-guru
VITE_FIREBASE_STORAGE_BUCKET=aicoder-guru.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_APP_URL=http://localhost:5173
```

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
