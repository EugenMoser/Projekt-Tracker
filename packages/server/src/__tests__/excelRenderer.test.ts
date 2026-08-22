import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import type { ExportRow, TagMap } from '../repositories/export.js'
import { renderExcel } from '../services/excelRenderer.js'

const hourlyRow: ExportRow = {
  customerNumber: '26101',
  customerName: 'Müller GmbH',
  street: 'Hauptstr. 1',
  zip: '12345',
  city: 'Berlin',
  projectId: 'proj-1',
  projectTitle: 'Hochzeit Müller',
  pricingMode: 'hourly',
  hourlyRateCents: 8000,
  fixedPriceCents: null,
  taskId: 'task-1',
  taskDescription: 'Bildbearbeitung',
  billable: true,
  totalSeconds: 7200,
  totalAmountCents: 16000,
}

const fixedRow1: ExportRow = {
  customerNumber: '26202',
  customerName: 'Schmidt AG',
  street: null,
  zip: null,
  city: null,
  projectId: 'proj-2',
  projectTitle: 'Logo Schmidt',
  pricingMode: 'fixed',
  hourlyRateCents: null,
  fixedPriceCents: 50000,
  taskId: 'task-2',
  taskDescription: 'Konzeption',
  billable: true,
  totalSeconds: 3600,
  totalAmountCents: 0,
}

const fixedRow2: ExportRow = {
  ...fixedRow1,
  taskId: 'task-3',
  taskDescription: 'Design',
  totalSeconds: 5400,
}

const nonBillableRow: ExportRow = {
  ...hourlyRow,
  taskId: 'task-4',
  taskDescription: 'Kulanz',
  billable: false,
  totalSeconds: 3600,
  totalAmountCents: 0,
}

async function readWorkbook(buf: Buffer<ArrayBufferLike>): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buf as any)
  return wb
}

describe('renderExcel', () => {
  it('produces a valid xlsx buffer', async () => {
    const buf = await renderExcel([hourlyRow], {})
    expect(buf.length).toBeGreaterThan(100)
    const wb = await readWorkbook(buf)
    expect(wb.worksheets).toHaveLength(1)
  })

  it('header row contains required column titles', async () => {
    const buf = await renderExcel([hourlyRow], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const header = sheet.getRow(1).values as (string | undefined)[]
    expect(header).toContain('Kundennr.')
    expect(header).toContain('Aufgabe')
    expect(header).toContain('Zeit')
    expect(header).toContain('Stundensatz')
    expect(header).toContain('Betrag')
  })

  it('hourly data row has correct time, rate and amount', async () => {
    const buf = await renderExcel([hourlyRow], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const row = sheet.getRow(2).values as (string | undefined)[]
    const rowStr = row.join('|')
    expect(rowStr).toContain('26101')
    expect(rowStr).toContain('02:00:00')
    expect(rowStr).toContain('80,00')
    expect(rowStr).toContain('160,00')
  })

  it('fixed-price first task row shows Festpreis in Betrag', async () => {
    const buf = await renderExcel([fixedRow1, fixedRow2], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const row2 = (sheet.getRow(2).values as (string | undefined)[]).join('|')
    expect(row2).toContain('500,00')
    expect(row2).not.toContain('€/h')
  })

  it('fixed-price second task row has blank Betrag', async () => {
    const buf = await renderExcel([fixedRow1, fixedRow2], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const row3 = (sheet.getRow(3).values as (string | undefined)[]).join('|')
    expect(row3).not.toContain('500,00')
  })

  it('renders comma-separated tags', async () => {
    const tagMap: TagMap = { 'task-1': ['Website', 'Hochzeit'] }
    const buf = await renderExcel([hourlyRow], tagMap)
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const row = (sheet.getRow(2).values as (string | undefined)[]).join('|')
    expect(row).toContain('Website, Hochzeit')
  })

  it('empty rows array produces only the header row', async () => {
    const buf = await renderExcel([], {})
    const wb = await readWorkbook(buf)
    expect(wb.worksheets[0].rowCount).toBe(1)
  })

  it('header row contains the Fakturierbar column', async () => {
    const buf = await renderExcel([hourlyRow], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const header = sheet.getRow(1).values as (string | undefined)[]
    expect(header).toContain('Fakturierbar')
  })

  it('non-billable row shows Nein and blank Stundensatz/Betrag', async () => {
    const buf = await renderExcel([nonBillableRow], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const row = (sheet.getRow(2).values as (string | undefined)[]).join('|')
    expect(row).toContain('Nein')
    expect(row).not.toContain('80,00')
    expect(row).not.toContain('€/h')
  })

  it('billable row shows Ja', async () => {
    const buf = await renderExcel([hourlyRow], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const row = (sheet.getRow(2).values as (string | undefined)[]).join('|')
    expect(row).toContain('Ja')
  })
})
