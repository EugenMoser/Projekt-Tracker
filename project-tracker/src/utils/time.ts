export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function durationSeconds(startedAt: Date, endedAt: Date): number {
  return Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
}

export function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseDateTimeLocal(dateStr: string, timeStr: string): Date | null {
  const dt = new Date(`${dateStr}T${timeStr}:00`)
  return isNaN(dt.getTime()) ? null : dt
}
