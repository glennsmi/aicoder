# Developer Mode

## Overview
Developer mode is a special feature that is only available to specific developers based on their Firebase Auth UID. When enabled, developers get access to additional tools and settings that are hidden from regular users.

## Configuration

### Adding Developer UIDs
Developer UIDs are configured in the `.env` file using the `VITE_DEV_UIDS` environment variable:

```env
VITE_DEV_UIDS=XaQ8ObUUEISUh5r7Y3gFomS3ePf2,Ht96Ow1qEiVTs2qBMzq9l8kodJ03
```

Multiple UIDs can be added as a comma-separated list.

## Features

### Test Mode Toggle
When you're logged in as a developer, you'll see a "Test Mode" toggle at the bottom of the sidebar (above the theme toggle). This allows you to:

- Enable/disable test mode with a single click
- See the current test mode status (ON/OFF badge)
- Test mode preference is saved to localStorage and persists across sessions

### Visual Indicators
- **Test Mode OFF**: Gray badge, normal sidebar appearance
- **Test Mode ON**: Yellow badge with yellow highlight, making it obvious when test mode is active

## Usage in Components

### Check if user is a developer
```typescript
import { useDeveloper } from '../contexts/DeveloperContext'

function MyComponent() {
  const { isDevMode } = useDeveloper()
  
  if (isDevMode) {
    // Show developer-only features
  }
}
```

### Check test mode status
```typescript
import { useDeveloper } from '../contexts/DeveloperContext'

function MyComponent() {
  const { testMode } = useDeveloper()
  
  if (testMode) {
    // Use test/mock data
    console.log('🧪 Test mode is active')
  } else {
    // Use production data
  }
}
```

### Toggle test mode programmatically
```typescript
import { useDeveloper } from '../contexts/DeveloperContext'

function MyComponent() {
  const { toggleTestMode } = useDeveloper()
  
  // Call toggleTestMode() to switch test mode on/off
}
```

## Example Use Cases

1. **Mock Data**: Show test data instead of real API calls
2. **Debug Features**: Enable additional logging or debug panels
3. **Feature Flags**: Test new features before releasing to all users
4. **Bypass Restrictions**: Skip certain validations or limits during development
5. **Testing Workflows**: Simulate different user states or scenarios

## Security Notes

- Developer mode is **client-side only** and should not be used for security-critical features
- Always validate permissions on the backend
- Test mode is stored in localStorage and can be cleared by the user
- Only use for development and testing purposes
