# Cursor Costs Template

A modern, full-stack React template with Vite, Firebase, Tailwind CSS v4, and shared TypeScript models.

## Features

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for lightning-fast development
- **Tailwind CSS v4** with the latest features
- **React Router** for client-side routing
- **Firebase SDK** for authentication and data

### Backend Stack
- **Firebase Functions v2** deployed to Europe West 2
- **Firestore** for real-time database operations
- **TypeScript** for type safety
- **Shared data models** between frontend and backend
- **Zod** for runtime validation
- **CORS** support for cross-origin requests

### Architecture
- **Monorepo** structure with workspaces
- **Shared types** and utilities
- **Modern tooling** with ESLint and TypeScript
- **Firebase emulators** for local development
- **Firestore security rules** configured

## Project Structure

```
cursor_costs/
├── package.json              # Root workspace configuration
├── firebase.json             # Firebase project configuration
├── .firebaserc              # Firebase project settings
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore indexes
├── shared/                  # Shared types and models
│   ├── src/
│   │   ├── types/          # TypeScript interfaces
│   │   ├── schemas/        # Zod validation schemas
│   │   └── index.ts        # Shared utilities
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── config/         # Configuration files
│   │   └── main.tsx        # Application entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
└── functions/              # Firebase Functions
    ├── src/
    │   └── index.ts        # Functions entry point with Firestore ops
    ├── package.json
    └── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd cursor_costs
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Configure Firebase:**
   - Your project is set to: `cursorcosts`
   - Get your Firebase configuration from [Firebase Console](https://console.firebase.google.com/project/cursorcosts/settings/general)
   - Update `frontend/src/config/firebase.ts` with your actual Firebase configuration

4. **Build shared models:**
   ```bash
   npm run build --workspace=shared
   ```

### Development

1. **Start the development servers:**
   ```bash
   # Terminal 1: Start frontend
   npm run dev
   
   # Terminal 2: Start Firebase emulators (optional)
   npm run firebase:emulators
   
   # Terminal 3: Start functions development (optional)
   npm run functions:dev
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Firebase Emulator UI: http://localhost:4000
   - Functions: http://localhost:5001

### Available Scripts

#### Root Level
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build
- `npm run firebase:emulators` - Start Firebase emulators
- `npm run firebase:deploy` - Deploy functions to Firebase
- `npm run install:all` - Install all workspace dependencies

#### Frontend
- `npm run dev --workspace=frontend` - Start Vite dev server
- `npm run build --workspace=frontend` - Build for production
- `npm run lint --workspace=frontend` - Run ESLint

#### Functions
- `npm run build --workspace=functions` - Compile TypeScript
- `npm run dev --workspace=functions` - Watch mode compilation
- `npm run serve --workspace=functions` - Start functions emulator

#### Shared
- `npm run build --workspace=shared` - Compile shared types
- `npm run dev --workspace=shared` - Watch mode compilation

## Firebase Functions

The application includes a Firebase function for automated email notifications:

### Available Functions

1. **`sendWelcomeEmail`** (Firestore Trigger) - Automatically sends a welcome email when a new user document is created in the `users` collection

### How it Works

The function is triggered automatically when a new document is created in the `users/{userId}` path in Firestore. It:

1. Extracts the user's email and display name from the document
2. Prepares a welcome email with both HTML and text versions
3. Logs the email content (ready for actual email service integration)

### Email Service Integration

The function is **fully implemented with SendGrid** for email delivery. To set it up:

1. **Quick Setup**: Follow the detailed guide in [`functions/SENDGRID_SETUP.md`](functions/SENDGRID_SETUP.md)
2. **Get a SendGrid API key** (free tier available)
3. **Verify your sender email** in SendGrid
4. **Set the environment variable**: `SENDGRID_API_KEY`
5. **Update the sender email** in the function code

The function includes:
- ✅ Professional HTML email templates
- ✅ Plain text fallback
- ✅ Error handling and logging
- ✅ Production-ready configuration

## Configuration

### Firebase Configuration

1. **Frontend Configuration** (`frontend/src/config/firebase.ts`):
   ```typescript
   export const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "cursorcosts.firebaseapp.com",
     projectId: "cursorcosts",
     storageBucket: "cursorcosts.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456"
   }
   ```

2. **Functions Configuration**:
   - Functions are configured to deploy to `europe-west2`
   - Uses Firebase Functions v2 for better performance
   - Includes CORS support for frontend communication
   - Integrated with Firestore for data operations

### Firestore Security Rules

The template includes production-ready security rules in `firestore.rules`:

- Users can read/write their own user documents
- Authenticated users can read other user profiles (display names)
- Example post collection with author-based permissions
- Development rules available (commented out)

### Tailwind CSS v4

This template uses Tailwind CSS v4 with the new Vite plugin. Key features:
- Faster compilation
- Improved tree-shaking
- Better developer experience
- Lightning-fast HMR

### Shared Models

The shared workspace contains:
- **TypeScript interfaces** for type safety
- **Zod schemas** for runtime validation
- **Firestore-specific types** with timestamp handling
- **Collection constants** for consistent naming
- **Utility functions** for API responses

Example usage:
```typescript
import { User, COLLECTIONS, createSuccessResponse } from '@cursor-costs/shared';

// Use shared constants
const usersRef = db.collection(COLLECTIONS.USERS);

// Use shared types
const user: User = { /* ... */ };

// Use shared utility functions
const response = createSuccessResponse(user, 'User created successfully');
```

## Deployment

### Frontend (Firebase Hosting)
```bash
npm run build
firebase deploy --only hosting
```

### Functions
```bash
npm run firebase:deploy
```

### Firestore Rules & Indexes
```bash
firebase deploy --only firestore
```

### Full Deployment
```bash
npm run build
firebase deploy
```

## Development Tips

1. **Enable Firestore**: Visit [Firestore Console](https://console.firebase.google.com/project/cursorcosts/firestore) to initialize your database

2. **Authentication**: Set up authentication providers in the [Firebase Console](https://console.firebase.google.com/project/cursorcosts/authentication)

3. **Local Development**: Use Firebase emulators for local development to avoid hitting production services

4. **Security Rules**: Update `firestore.rules` for your specific use case before deploying to production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 