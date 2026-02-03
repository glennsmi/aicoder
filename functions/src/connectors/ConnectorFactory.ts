import { BaseConnector } from './BaseConnector'
import { GitHubCopilotConnector } from './GitHubCopilotConnector'
import { OpenAIConnector } from './OpenAIConnector'
import { AnthropicUsageConnector } from './AnthropicUsageConnector'
import { AnthropicCodeConnector } from './AnthropicCodeConnector'
import { GoogleCloudBillingConnector } from './GoogleCloudBillingConnector'
import {
  AIProvider,
  ProviderCredentials,
  GitHubCopilotCredentials,
  OpenAICredentials,
  AnthropicUsageCredentials,
  AnthropicCodeCredentials,
  GoogleCloudBillingCredentials
} from '../shared'

/**
 * Factory class to create connector instances
 */
export class ConnectorFactory {
  static createConnector(
    provider: AIProvider,
    credentials: ProviderCredentials
  ): BaseConnector {
    switch (provider) {
      case 'github_copilot':
        return new GitHubCopilotConnector(credentials as GitHubCopilotCredentials)

      case 'openai_codex':
        return new OpenAIConnector(credentials as OpenAICredentials)

      case 'anthropic_usage':
        return new AnthropicUsageConnector(credentials as AnthropicUsageCredentials)

      case 'anthropic_code':
      case 'claude_code':
        return new AnthropicCodeConnector(credentials as AnthropicCodeCredentials)

      case 'google_cloud_billing':
        return new GoogleCloudBillingConnector(credentials as GoogleCloudBillingCredentials)

      case 'cursor':
        throw new Error('Cursor integration uses CSV upload only. API not available.')

      case 'gemini':
      case 'codeium':
      case 'tabnine':
      case 'replit_ghostwriter':
      case 'aws_codewhisperer':
        throw new Error(`${provider} connector not yet implemented. Coming soon!`)

      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  /**
   * Get list of supported providers with API integrations
   */
  static getSupportedProviders(): AIProvider[] {
    return [
      'github_copilot',
      'openai_codex',
      'anthropic_usage',
      'anthropic_code',
      'claude_code',
      'google_cloud_billing'
    ]
  }

  /**
   * Check if a provider is supported
   */
  static isSupported(provider: AIProvider): boolean {
    return this.getSupportedProviders().includes(provider)
  }
}


