import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:https'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import test from 'node:test'

const runNode = promisify(execFile)
const certificatePath = fileURLToPath(new URL('./fixtures/server-cert.pem', import.meta.url))

test('native fetch supports trusted HTTPS, prefixes, headers and broadcasting', async (context) => {
  const calls = []
  const server = createServer({
    key: readFileSync(new URL('./fixtures/server-key.pem', import.meta.url)),
    cert: readFileSync(certificatePath)
  }, async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    calls.push({ path: request.url, method: request.method, headers: request.headers, body })
    response.end(request.method === 'POST' ? 'broadcast-txid' : JSON.stringify({ txid: '123' }))
  })
  context.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = `https://127.0.0.1:${server.address().port}/api/`
  const script = `
    import assert from 'node:assert/strict'
    import { MempoolClient, MempoolApiError } from 'mempool-api-node'
    const client = new MempoolClient({ url: process.env.TEST_MEMPOOL_URL, headers: { Authorization: 'Bearer token' } })
    if (process.env.TEST_TRUST_TLS === 'yes') {
      assert.deepEqual(await client.getTransaction('123'), { txid: '123' })
      assert.equal(await client.broadcastTransaction('raw hex'), 'broadcast-txid')
    } else {
      await assert.rejects(client.getTransaction('123'), (error) => {
        assert.ok(error instanceof MempoolApiError)
        assert.ok(error.cause instanceof Error)
        assert.equal(error.cause.cause.code, 'DEPTH_ZERO_SELF_SIGNED_CERT')
        assert.equal(error.method, 'GET')
        assert.equal(error.url, process.env.TEST_MEMPOOL_URL + 'tx/123')
        return true
      })
    }
  `
  const baseEnvironment = { ...process.env, TEST_MEMPOOL_URL: url }
  delete baseEnvironment.NODE_EXTRA_CA_CERTS
  await runNode(process.execPath, ['--input-type=module', '--eval', script], {
    env: { ...baseEnvironment, TEST_TRUST_TLS: 'no' }, timeout: 15000
  })
  assert.equal(calls.length, 0)
  await runNode(process.execPath, ['--input-type=module', '--eval', script], {
    env: { ...baseEnvironment, NODE_EXTRA_CA_CERTS: certificatePath, TEST_TRUST_TLS: 'yes' }, timeout: 15000
  })
  assert.deepEqual(calls.map((call) => call.path), ['/api/tx/123', '/api/tx'])
  assert.deepEqual(calls.map((call) => call.method), ['GET', 'POST'])
  assert.ok(calls.every((call) => call.headers.authorization === 'Bearer token'))
  assert.equal(calls[1].headers['content-type'], 'text/plain')
  assert.equal(calls[1].body, 'raw hex')
})
