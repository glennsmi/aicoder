/**
 * Generate AES-256-GCM Encryption Key
 * 
 * Run this script once to generate a secure encryption key for API credentials
 * Store the output in your environment variables or Firebase config
 * 
 * Usage:
 *   node scripts/generateEncryptionKey.js
 */

const crypto = require('crypto')

function generateEncryptionKey() {
  // Generate 256-bit (32 byte) key
  const key = crypto.randomBytes(32)
  const base64Key = key.toString('base64')
  
  console.log('\n🔐 API Credentials Encryption Key Generated\n')
  console.log('━'.repeat(60))
  console.log('\nYour encryption key (keep this secret!):\n')
  console.log(base64Key)
  console.log('\n━'.repeat(60))
  console.log('\n📋 Setup Instructions:\n')
  console.log('1. For local development:')
  console.log('   Add to functions/.env:')
  console.log(`   CREDENTIALS_ENCRYPTION_KEY="${base64Key}"`)
  console.log('\n2. For production deployment:')
  console.log('   Run this command:')
  console.log(`   firebase functions:config:set credentials.encryption_key="${base64Key}"`)
  console.log('\n   Or set as environment variable in Firebase Console')
  console.log('\n3. For Google Cloud Secret Manager (recommended for production):')
  console.log('   a. Create secret:')
  console.log(`      echo -n "${base64Key}" | gcloud secrets create credentials-encryption-key --data-file=-`)
  console.log('   b. Grant access to Cloud Functions service account')
  console.log('   c. Update function to read from Secret Manager')
  console.log('\n⚠️  IMPORTANT: Store this key securely!')
  console.log('   - Never commit it to git')
  console.log('   - Keep a backup in a secure location')
  console.log('   - Rotating this key will invalidate all existing encrypted credentials')
  console.log('\n')
}

generateEncryptionKey()


