import { clearAllTables as _clearAllTables, resetDatabase as _resetDatabase } from '@db/queries/reset.queries'

export async function clearAllTables() {
  return _clearAllTables()
}

export async function resetDatabase() {
  return _resetDatabase()
}

export const databaseMaintenance = {
  clearAllTables,
  resetDatabase
}
