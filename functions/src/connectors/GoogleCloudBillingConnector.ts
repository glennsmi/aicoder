import { BigQuery } from '@google-cloud/bigquery'
import {
  UsageData,
  TestConnectionResult,
  GoogleCloudBillingCredentials,
  AIProvider
} from '../shared'
import { BaseConnector } from './BaseConnector'

type BigQueryBillingRow = {
  date: string
  projectId: string | null
  serviceDescription: string | null
  skuDescription: string | null
  currency: string | null
  cost: number | string | null
  credits?: number | string | null
  labelValue?: string | null
}

/**
 * Google Cloud Billing connector
 *
 * Important: The Cloud Billing REST API mostly exposes billing account metadata and SKU catalog.
 * For actual cost line items, this connector reads from BigQuery Billing Export.
 */
export class GoogleCloudBillingConnector extends BaseConnector {
  private creds: GoogleCloudBillingCredentials
  private bigquery: BigQuery

  constructor(credentials: GoogleCloudBillingCredentials) {
    super('google_cloud_billing' as AIProvider, credentials)
    this.creds = credentials
    this.bigquery = this.createBigQueryClient(credentials)
  }

  private createBigQueryClient(credentials: GoogleCloudBillingCredentials): BigQuery {
    let parsed: any
    try {
      parsed = JSON.parse(credentials.serviceAccountJson)
    } catch (e) {
      throw new Error('Invalid service account JSON. Paste the full JSON key contents.')
    }

    if (!parsed?.client_email || !parsed?.private_key) {
      throw new Error('Service account JSON is missing client_email or private_key.')
    }

    return new BigQuery({
      projectId: credentials.bigQueryProjectId || parsed.project_id,
      credentials: {
        client_email: parsed.client_email,
        private_key: parsed.private_key
      }
    })
  }

  private getTableRef(): string {
    const { bigQueryProjectId, datasetId, tableId } = this.creds
    if (!bigQueryProjectId || !datasetId || !tableId) {
      throw new Error('Missing BigQuery configuration (bigQueryProjectId, datasetId, tableId).')
    }
    return `\`${bigQueryProjectId}.${datasetId}.${tableId}\``
  }

  private getQueryLocationsToTry(): Array<string | undefined> {
    const configured = this.creds.bigQueryLocation?.trim()
    if (configured) return [configured]
    // Try without location first, then common multi-regions
    return [undefined, 'EU', 'US']
  }

  private async runQuery(query: string, params?: Record<string, any>): Promise<any[]> {
    let lastError: unknown

    for (const location of this.getQueryLocationsToTry()) {
      try {
        const [job] = await this.bigquery.createQueryJob({
          query,
          params,
          ...(location ? { location } : {})
        })
        const [rows] = await job.getQueryResults()
        return rows as any[]
      } catch (e) {
        lastError = e
      }
    }

    throw lastError
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      if (this.creds.type !== 'bigquery_billing_export') {
        return { success: false, message: 'Unsupported Google Cloud credential type.' }
      }

      const tableRef = this.getTableRef()

      // Validate dataset/table exist and credentials can query
      const query = `SELECT 1 AS ok FROM ${tableRef} LIMIT 1`
      await this.runQuery(query)

      return {
        success: true,
        message: 'BigQuery billing export connection successful',
        metadata: {
          bigQueryProjectId: this.creds.bigQueryProjectId,
          datasetId: this.creds.datasetId,
          tableId: this.creds.tableId,
          attributionLabelKey: this.creds.attributionLabelKey || null
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return { success: false, message: msg }
    }
  }

  async fetchUsage(startDate: string, endDate: string): Promise<UsageData[]> {
    const tableRef = this.getTableRef()
    const labelKey = this.creds.attributionLabelKey?.trim()

    const usage: UsageData[] = []

    // Best-effort query: include credits + labels if present. Fall back if schema differs.
    const queryWithCreditsAndLabels = `
      WITH base AS (
        SELECT
          FORMAT_DATE('%F', DATE(usage_start_time)) AS date,
          project.id AS projectId,
          service.description AS serviceDescription,
          sku.description AS skuDescription,
          currency AS currency,
          cost AS cost,
          (SELECT IFNULL(SUM(c.amount), 0) FROM UNNEST(credits) c) AS creditsAmount,
          ${labelKey ? `(SELECT l.value FROM UNNEST(labels) l WHERE l.key = @labelKey LIMIT 1) AS labelValue` : 'CAST(NULL AS STRING) AS labelValue'}
        FROM ${tableRef}
        WHERE DATE(usage_start_time) BETWEEN @startDate AND @endDate
      )
      SELECT
        date,
        projectId,
        serviceDescription,
        skuDescription,
        currency,
        SUM(cost) AS cost,
        SUM(creditsAmount) AS credits,
        labelValue
      FROM base
      GROUP BY date, projectId, serviceDescription, skuDescription, currency, labelValue
      ORDER BY date DESC
    `

    const queryCostOnly = `
      SELECT
        FORMAT_DATE('%F', DATE(usage_start_time)) AS date,
        project.id AS projectId,
        service.description AS serviceDescription,
        sku.description AS skuDescription,
        currency AS currency,
        SUM(cost) AS cost
      FROM ${tableRef}
      WHERE DATE(usage_start_time) BETWEEN @startDate AND @endDate
      GROUP BY date, projectId, serviceDescription, skuDescription, currency
      ORDER BY date DESC
    `

    let rows: BigQueryBillingRow[]
    try {
      rows = (await this.runQuery(queryWithCreditsAndLabels, {
        startDate,
        endDate,
        ...(labelKey ? { labelKey } : {})
      })) as BigQueryBillingRow[]
    } catch (e) {
      rows = (await this.runQuery(queryCostOnly, { startDate, endDate })) as BigQueryBillingRow[]
    }

    for (const row of rows) {
      const rawCost = row.cost === null ? 0 : Number(row.cost)
      const credits = row.credits === undefined || row.credits === null ? 0 : Number(row.credits)
      const netCost = rawCost + credits

      const serviceDescription = row.serviceDescription || 'Google Cloud'
      const skuDescription = row.skuDescription || 'Unknown SKU'

      usage.push({
        date: row.date,
        provider: 'google_cloud_billing',
        model: `${serviceDescription} — ${skuDescription}`,
        userEmail: row.labelValue || undefined,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
        requests: 0,
        cost: Number.isFinite(netCost) ? netCost : 0,
        currency: row.currency || 'USD',
        metadata: {
          projectId: row.projectId || undefined,
          serviceDescription,
          skuDescription,
          costGross: Number.isFinite(rawCost) ? rawCost : 0,
          credits: Number.isFinite(credits) ? credits : 0,
          attributionLabelKey: labelKey || undefined
        }
      })
    }

    return usage
  }
}

