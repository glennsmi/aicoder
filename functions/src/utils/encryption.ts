import * as crypto from 'crypto'
import { EncryptedCredentials, ProviderCredentials } from '../shared'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * AES-256-GCM encryption for API credentials
 * Follows security best practices for credential storage
 */
export class CredentialEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32 // 256 bits
  private static readonly IV_LENGTH = 16 // 128 bits

  /**
   * Get encryption key from environment or Secret Manager
   * In production, this should be stored in Google Cloud Secret Manager
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.CREDENTIALS_ENCRYPTION_KEY

    if (!key) {
      throw new Error('CREDENTIALS_ENCRYPTION_KEY environment variable not set')
    }

    // Key should be base64 encoded
    return Buffer.from(key, 'base64')
  }

  /**
   * Encrypt credentials using AES-256-GCM
   * @param credentials Plain credentials object
   * @returns Encrypted credentials with IV and auth tag
   */
  static encryptCredentials(credentials: ProviderCredentials): EncryptedCredentials {
    try {
      // Convert credentials to JSON string
      const plaintext = JSON.stringify(credentials)

      // Get encryption key
      const key = this.getEncryptionKey()

      // Generate random initialization vector
      const iv = crypto.randomBytes(this.IV_LENGTH)

      // Create cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64')
      encrypted += cipher.final('base64')

      // Get authentication tag
      const authTag = cipher.getAuthTag()

      return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        encryptedAt: Timestamp.now()
      }
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Decrypt credentials using AES-256-GCM
   * @param encrypted Encrypted credentials object
   * @returns Plain credentials object
   */
  static decryptCredentials(encrypted: EncryptedCredentials): ProviderCredentials {
    try {
      // Get encryption key
      const key = this.getEncryptionKey()

      // Convert IV and auth tag from base64
      const iv = Buffer.from(encrypted.iv, 'base64')
      const authTag = Buffer.from(encrypted.authTag, 'base64')

      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      // Decrypt the data
      let decrypted = decipher.update(encrypted.encryptedData, 'base64', 'utf8')
      decrypted += decipher.final('utf8')

      // Parse JSON
      return JSON.parse(decrypted) as ProviderCredentials
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Generate a new encryption key (for initial setup or rotation)
   * @returns Base64-encoded 256-bit key
   */
  static generateEncryptionKey(): string {
    const key = crypto.randomBytes(this.KEY_LENGTH)
    return key.toString('base64')
  }

  /**
   * Validate that credentials can be encrypted and decrypted
   * @param credentials Credentials to test
   * @returns true if valid, throws error otherwise
   */
  static validateEncryption(credentials: ProviderCredentials): boolean {
    const encrypted = this.encryptCredentials(credentials)
    const decrypted = this.decryptCredentials(encrypted)

    // Compare original and decrypted
    const original = JSON.stringify(credentials)
    const recovered = JSON.stringify(decrypted)

    if (original !== recovered) {
      throw new Error('Encryption validation failed: decrypted data does not match original')
    }

    return true
  }
}

