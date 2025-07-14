import { test, expect } from 'bun:test'
import { appInstance } from '@/index'

test('GET /health returns OK', async () => {
  const res = await appInstance.request('/health')
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('OK')
}) 