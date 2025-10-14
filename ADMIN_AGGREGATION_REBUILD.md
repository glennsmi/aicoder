# Admin Aggregation Rebuild Tool

## Overview

The **Admin Aggregation Rebuild Tool** allows administrators to rebuild aggregated usage data from raw entries for any user. This is useful for:

- **Fixing aggregation issues** caused by duplicate data
- **Applying new deduplication logic** to existing data
- **Recovering from data corruption** in aggregations
- **Migrating data** after schema changes

## Key Features

✅ **Preserves Raw Data** - Only clears and rebuilds aggregations, raw data is untouched
✅ **User-Specific** - Target any user by their Firebase User ID
✅ **Safe Operation** - Uses atomic batch operations for consistency
✅ **Detailed Reporting** - Shows exactly what was processed and rebuilt
✅ **Admin-Only Access** - Restricted to admin users only

## How to Use

### 1. Access Admin Panel
- Sign in as an admin user (`glenn@fueld.ai`)
- Click the **Admin** button in the top navigation
- Navigate to the **Data Management** section

### 2. Rebuild Aggregations
1. **Enter User ID** - Paste the Firebase User ID of the target user
   - Your own User ID is shown for reference
   - User IDs look like: `abc123xyz789...`

2. **Click "Rebuild Aggregations"** - This will:
   - Fetch all raw usage data for the user
   - Clear existing aggregations
   - Rebuild aggregations from raw data
   - Add content hashes to raw entries (if missing)

3. **Review Results** - The tool shows:
   - Raw entries processed
   - Old aggregations cleared
   - New aggregations created
   - Any errors encountered

## What Happens During Rebuild

### Step 1: Data Collection
```
📊 Fetching all raw usage data...
Found 1,247 raw entries for user abc123xyz
```

### Step 2: Clear Existing Aggregations
```
🧽 Clearing existing aggregations...
Found 156 existing aggregations to clear
```

### Step 3: Rebuild from Raw Data
```
🏗️ Rebuilding aggregations from raw data...
Processing entries by minute/model/status...
```

### Step 4: Add Content Hashes
```
🏷️ Adding content hashes to raw entries...
Updating entries missing content hashes...
```

### Step 5: Commit Changes
```
💾 Committing all changes...
✅ Aggregation rebuild completed successfully!
```

## Example Results

```
📊 Final summary:
  - Raw entries processed: 1,247
  - Old aggregations cleared: 156
  - New aggregations created: 142
```

**Why fewer new aggregations?** The rebuild process applies proper deduplication logic, so duplicate data that was previously creating separate aggregations is now properly merged.

## Safety Considerations

### ✅ Safe Operations
- **Raw data is preserved** - Only aggregations are rebuilt
- **Atomic operations** - Uses Firestore batch writes for consistency
- **Rollback possible** - Raw data can always be re-aggregated
- **Admin-only access** - Restricted to authorized users

### ⚠️ Important Notes
- **Temporary data unavailability** - User's charts may show no data briefly during rebuild
- **Performance impact** - Large datasets may take time to process
- **User notification** - Consider informing users before rebuilding their data

## Use Cases

### 1. Fix Duplicate Data Issues
**Problem**: User imported same data multiple times, causing inflated aggregations
**Solution**: Rebuild aggregations with proper deduplication logic

### 2. Apply New Deduplication Logic
**Problem**: Updated deduplication algorithm needs to be applied to existing data
**Solution**: Rebuild aggregations to apply new logic retroactively

### 3. Recover from Data Corruption
**Problem**: Aggregations are corrupted or inconsistent
**Solution**: Rebuild clean aggregations from trusted raw data

### 4. Schema Migration
**Problem**: Aggregation schema changed, need to update existing data
**Solution**: Rebuild aggregations with new schema structure

## Finding User IDs

### Method 1: From User Account
- User can find their ID in Account Settings
- Displayed as: `Your User ID: abc123xyz...`

### Method 2: From Firebase Console
- Go to Firebase Console → Authentication
- Find user by email
- Copy the User UID

### Method 3: From Browser Console (for logged-in user)
```javascript
// In browser console while user is logged in
firebase.auth().currentUser.uid
```

## Monitoring and Logs

### Browser Console
The rebuild process logs detailed progress:
```
🔧 ADMIN: Starting aggregation rebuild for user: abc123xyz
📊 Fetching all raw usage data...
Found 1247 raw entries for user abc123xyz
🧽 Clearing existing aggregations...
Found 156 existing aggregations to clear
🏗️ Rebuilding aggregations from raw data...
🏷️ Adding content hashes to raw entries...
💾 Committing all changes...
✅ ADMIN: Aggregation rebuild completed successfully!
```

### Error Handling
If errors occur, they are:
- Logged to console with details
- Displayed in the UI results
- Included in the final summary

## Best Practices

### 1. **Backup First** (Optional)
While raw data is preserved, you can export user data before rebuilding:
- Use the CSV export feature
- Download user's current aggregated data

### 2. **Test with Small Users First**
- Start with users who have less data
- Verify the process works as expected
- Then proceed with larger datasets

### 3. **Communicate with Users**
- Inform users their data is being optimized
- Explain temporary unavailability
- Confirm completion when done

### 4. **Monitor Performance**
- Watch for any performance issues
- Consider rebuilding during low-traffic periods
- Process large users individually

## Troubleshooting

### Issue: "No raw data found for user"
**Cause**: User ID doesn't exist or has no raw usage data
**Solution**: Verify the User ID is correct

### Issue: "Permission denied"
**Cause**: Not signed in as admin user
**Solution**: Sign in with admin account (`glenn@fueld.ai`)

### Issue: "Batch write error"
**Cause**: Firestore write limits exceeded or network issues
**Solution**: Retry the operation, consider smaller batches for very large datasets

### Issue: Aggregations not appearing in UI
**Cause**: User needs to refresh their browser
**Solution**: User should refresh the page to see updated data

## Technical Details

### Function: `adminRebuildUserAggregations(userId: string)`

**Parameters:**
- `userId`: Firebase User ID to rebuild aggregations for

**Returns:**
```typescript
{
  totalRawEntries: number      // Raw entries processed
  aggregationsCleared: number  // Old aggregations removed
  aggregationsRebuilt: number  // New aggregations created
  errors: string[]            // Any errors encountered
}
```

**Location:** `frontend/src/lib/firestore.ts`

### Security
- Function checks admin status in UI
- Firestore security rules enforce user-specific access
- Only admin users can access the admin panel

This tool provides a powerful way to maintain data integrity and apply improvements to existing user data while preserving the original raw information. 