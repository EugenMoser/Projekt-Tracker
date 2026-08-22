import ExcelJS from 'exceljs'

import type { ExportRow, TagMap } from '../repositories/export.js'

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function centsToEuroStr(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

export async function renderExcel(rows: ExportRow[], tagMap: TagMap): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const sheet = wb.addWorksheet('Export')

  sheet.columns = [
    { header: 'Kundennr.', key: 'customerNumber', width: 12 },
    { header: 'Name', key: 'customerName', width: 25 },
    { header: 'Straße', key: 'street', width: 25 },
    { header: 'PLZ', key: 'zip', width: 8 },
    { header: 'Ort', key: 'city', width: 20 },
    { header: 'Projekt', key: 'projectTitle', width: 25 },
    { header: 'Aufgabe', key: 'taskDescription', width: 25 },
    { header: 'Stichworte', key: 'tags', width: 25 },
    { header: 'Zeit', key: 'time', width: 12 },
    { header: 'Fakturierbar', key: 'billable', width: 12 },
    { header: 'Stundensatz', key: 'rate', width: 15 },
    { header: 'Betrag', key: 'amount', width: 15 },
  ]
  sheet.getRow(1).font = { bold: true }

  const fixedPriceShown = new Set<string>()

  for (const row of rows) {
    const tags = (tagMap[row.taskId] ?? []).join(', ')
    const time = formatSeconds(row.totalSeconds)
    let rate = ''
    let amount = ''

    if (row.pricingMode === 'hourly') {
      if (row.billable) {
        rate = centsToEuroStr(row.hourlyRateCents ?? 0).replace(' €', ' €/h')
        amount = centsToEuroStr(row.totalAmountCents)
      }
    } else {
      if (!fixedPriceShown.has(row.projectId)) {
        amount = centsToEuroStr(row.fixedPriceCents ?? 0)
        fixedPriceShown.add(row.projectId)
      }
    }

    sheet.addRow({
      customerNumber: row.customerNumber,
      customerName: row.customerName,
      street: row.street ?? '',
      zip: row.zip ?? '',
      city: row.city ?? '',
      projectTitle: row.projectTitle,
      taskDescription: row.taskDescription,
      tags,
      time,
      billable: row.billable ? 'Ja' : 'Nein',
      rate,
      amount,
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
