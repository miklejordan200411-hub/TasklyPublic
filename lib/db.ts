import { Pool } from 'pg'

const globalForPg = globalThis as unknown as { pool: Pool }

export const pool =
  globalForPg.pool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  })

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return res.rows as T[]
  } finally {
    client.release()
  }
}

// Run query with current user set (for history trigger)
export async function queryAsUser<T = any>(
  userId: string,
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await pool.connect()
  try {
    await client.query(`SET LOCAL app.current_user_id = $1`, [userId])
    const res = await client.query(text, params)
    return res.rows as T[]
  } finally {
    client.release()
  }
}

export async function withTransaction<T>(
  userId: string,
  fn: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SET LOCAL app.current_user_id = $1`, [userId])
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
