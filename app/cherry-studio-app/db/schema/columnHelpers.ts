import { integer } from 'drizzle-orm/sqlite-core'

const createTimestamp = () => {
  return Date.now()
}

export const createUpdateTimestamps = {
  created_at: integer('created_at').$defaultFn(createTimestamp),
  updated_at: integer('updated_at').$defaultFn(createTimestamp).$onUpdateFn(createTimestamp)
}

export const createUpdateDeleteTimestamps = {
  created_at: integer('created_at').$defaultFn(createTimestamp),
  updated_at: integer('updated_at').$defaultFn(createTimestamp).$onUpdateFn(createTimestamp),
  deleted_at: integer('deleted_at')
}
