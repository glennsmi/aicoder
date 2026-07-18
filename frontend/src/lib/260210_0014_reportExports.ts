import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type CsvColumn<T> = {
  header: string
  value: (row: T) => string | number | null | undefined
}

type PdfTable = {
  title: string
  columns: string[]
  rows: Array<Array<string | number>>
}

type PdfSummary = {
  label: string
  value: string
}

type PdfExportInput = {
  filename: string
  title: string
  subtitle: string
  generatedAt: string
  dateRangeLabel: string
  scopeLabel: string
  organizationName: string
  summary: PdfSummary[]
  tables: PdfTable[]
}

async function imageSourceToPngDataUrl(imageSource: string): Promise<string | null> {
  try {
    const img = new Image()
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.src = new URL(imageSource, window.location.origin).toString()

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image'))
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) return null

    context.drawImage(img, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function csvEscape(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  const header = columns.map((column) => csvEscape(column.header)).join(',')
  const body = rows.map((row) => {
    return columns.map((column) => {
      const value = column.value(row)
      if (value === null || value === undefined) return ''
      return csvEscape(String(value))
    }).join(',')
  })
  return [header, ...body].join('\n')
}

export function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}

export function downloadCsv(content: string, filename: string) {
  downloadTextFile(content, filename, 'text/csv;charset=utf-8;')
}

export async function exportPdfReport(input: PdfExportInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const marginLeft = 40
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Cover page styling
  doc.setFillColor(18, 76, 90)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  doc.setFillColor(100, 191, 164)
  doc.rect(0, pageHeight - 56, pageWidth, 56, 'F')

  const logoDataUrl = await imageSourceToPngDataUrl('/logos/AI Coder Guru Symbol.svg')
  if (logoDataUrl) {
    const logoSize = 124
    const logoX = (pageWidth - logoSize) / 2
    const logoY = 92
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.text(input.title, pageWidth / 2, 270, { align: 'center' })

  doc.setFontSize(12)
  doc.text('Professional Usage & Team Performance Report', pageWidth / 2, 294, { align: 'center' })

  doc.setFontSize(14)
  doc.text(input.organizationName, pageWidth / 2, 350, { align: 'center' })

  doc.setFontSize(11)
  doc.text(`Reporting period: ${input.dateRangeLabel}`, pageWidth / 2, 376, { align: 'center' })
  doc.text(`Scope: ${input.scopeLabel}`, pageWidth / 2, 394, { align: 'center' })
  doc.text(`Generated: ${input.generatedAt}`, pageWidth / 2, 412, { align: 'center' })

  doc.setFontSize(10)
  doc.text('AICoder.Guru', pageWidth / 2, pageHeight - 24, { align: 'center' })

  doc.addPage()
  doc.setTextColor(0, 0, 0)

  doc.setFontSize(18)
  doc.text(input.title, marginLeft, 48)

  doc.setFontSize(11)
  doc.text(input.subtitle, marginLeft, 68)
  doc.text(`Generated: ${input.generatedAt}`, marginLeft, 84)

  let y = 108
  doc.setFontSize(12)
  doc.text('Summary', marginLeft, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: input.summary.map((row) => [row.label, row.value]),
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [18, 76, 90] },
    margin: { left: marginLeft, right: marginLeft },
  })

  let nextY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 18 : 180

  for (const table of input.tables) {
    if (nextY > 700) {
      doc.addPage()
      nextY = 48
    }

    doc.setFontSize(12)
    doc.text(table.title, marginLeft, nextY)
    nextY += 8

    autoTable(doc, {
      startY: nextY,
      head: [table.columns],
      body: table.rows,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [18, 76, 90] },
      margin: { left: marginLeft, right: marginLeft },
    })

    nextY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 18 : nextY + 220
  }

  doc.save(input.filename)
}
