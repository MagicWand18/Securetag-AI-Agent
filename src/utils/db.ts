import { Pool } from 'pg'

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL || ''
    const host = process.env.POSTGRES_HOST || 'localhost'
    const port = parseInt(process.env.POSTGRES_PORT || '5432', 10)
    const db = process.env.POSTGRES_DB || 'securetag'
    const user = process.env.POSTGRES_USER || 'securetag'
    const password = process.env.POSTGRES_PASSWORD || 'securetagpwd'
    pool = url
      ? new Pool({ connectionString: url })
      : new Pool({ host, port, database: db, user, password })
  }
  return pool
}

export async function ensureTenant(name: string): Promise<string> {
  const p = getPool()
  const r = await p.query('SELECT id FROM securetag.tenant WHERE name=$1 LIMIT 1', [name])
  if (r.rows.length > 0) return r.rows[0].id
  const i = await p.query('INSERT INTO securetag.tenant(name, plan) VALUES($1,$2) RETURNING id', [name, 'dev'])
  return i.rows[0].id
}

export async function dbQuery<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  const p = getPool()
  const r = await p.query(text, params)
  return { rows: r.rows as T[] }
}

export async function updateTaskState(taskId: string, state: string): Promise<void> {
  await dbQuery(
    'UPDATE securetag.task SET status=$1, updated_at=NOW() WHERE id=$2',
    [state, taskId]
  )
}