import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'
import { MempoolClient, MempoolApiError } from 'mempool-api-node'
import { mockApi } from './helpers.js'

for (const [status, statusText, body] of [
  [404, 'Not Found', 'Transaction not found'],
  [500, 'Internal Server Error', '<html>Server failure</html>'],
  [503, 'Service Unavailable', '{"error":"unavailable"}']
]) {
  test(`preserves HTTP ${status} and its unparsed body`, async (context) => {
    const { url, calls } = await mockApi(context, (request, response) => {
      response.writeHead(status)
      response.end(body)
    })
    await assert.rejects(new MempoolClient({ url: `${url}/api` }).getTransaction('missing'), (error) => {
      assert.ok(error instanceof MempoolApiError)
      assert.equal(error.status, status)
      assert.equal(error.statusText, statusText)
      assert.equal(error.method, 'GET')
      assert.equal(error.url, `${url}/api/tx/missing`)
      assert.equal(error.body, body)
      assert.match(error.message, new RegExp(String(status)))
      return true
    })
    assert.equal(calls.length, 1)
  })
}

test('redirects are surfaced as HTTP errors without making a second request', async (context) => {
  const { url, calls } = await mockApi(context, (request, response) => {
    response.writeHead(302, { Location: '/destination' })
    response.end('redirect')
  })
  await assert.rejects(new MempoolClient({ url }).broadcastTransaction('hex'), { status: 302, body: 'redirect', method: 'POST' })
  assert.equal(calls.length, 1)
})

test('malformed JSON includes the raw response and original parsing error', async (context) => {
  const { url } = await mockApi(context, (request, response) => response.end('{invalid JSON'))
  await assert.rejects(new MempoolClient({ url }).getAddress('address'), (error) => {
    assert.ok(error instanceof MempoolApiError)
    assert.ok(error.cause instanceof SyntaxError)
    assert.equal(error.status, 200)
    assert.equal(error.statusText, 'OK')
    assert.equal(error.method, 'GET')
    assert.equal(error.url, `${url}/address/address`)
    assert.equal(error.body, '{invalid JSON')
    assert.match(error.message, /invalid JSON/u)
    return true
  })
})

for (const [status, statusText] of [[200, 'OK'], [204, 'No Content']]) {
  test(`empty HTTP ${status} JSON responses retain the HTTP context`, async (context) => {
    const { url } = await mockApi(context, (request, response) => {
      response.writeHead(status, { 'Content-Type': 'application/json' })
      response.end()
    })
    await assert.rejects(new MempoolClient({ url }).getTransaction('txid'), (error) => {
      assert.ok(error instanceof MempoolApiError)
      assert.ok(error.cause instanceof SyntaxError)
      assert.equal(error.status, status)
      assert.equal(error.statusText, statusText)
      assert.equal(error.method, 'GET')
      assert.equal(error.url, `${url}/tx/txid`)
      assert.equal(error.body, '')
      assert.equal(error.message, `Mempool GET ${url}/tx/txid returned invalid JSON`)
      return true
    })
  })
}

test('connection refusal preserves the original fetch failure', async () => {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = `http://127.0.0.1:${server.address().port}`
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await assert.rejects(new MempoolClient({ url }).getTipHash(), (error) => {
    assert.ok(error instanceof MempoolApiError)
    assert.ok(error.cause instanceof TypeError)
    assert.equal(error.cause.cause.code, 'ECONNREFUSED')
    assert.equal(error.method, 'GET')
    assert.equal(error.url, `${url}/blocks/tip/hash`)
    assert.equal(error.status, undefined)
    return true
  })
})

test('connection reset while reading a body retains the HTTP context', async (context) => {
  const { url } = await mockApi(context, (request, response) => {
    response.writeHead(200, { 'Content-Length': '100', Connection: 'close' })
    response.end('partial')
  })
  await assert.rejects(new MempoolClient({ url, timeout: 2000 }).getTransaction('txid'), (error) => {
    assert.ok(error instanceof MempoolApiError)
    assert.ok(error.cause instanceof Error)
    assert.equal(error.status, 200)
    assert.equal(error.method, 'GET')
    assert.equal(error.url, `${url}/tx/txid`)
    assert.match(error.message, /request failed/u)
    return true
  })
})

for (const sendHeaders of [false, true]) {
  test(`timeout covers ${sendHeaders ? 'reading the response body' : 'waiting for response headers'}`, async (context) => {
    const { url } = await mockApi(context, (request, response) => {
      if (sendHeaders) {
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.flushHeaders()
        response.write('{')
      }
    })
    await assert.rejects(new MempoolClient({ url, timeout: 150 }).getTransaction('txid'), (error) => {
      assert.ok(error instanceof MempoolApiError)
      assert.ok(error.cause instanceof Error)
      assert.match(error.message, /timed out after 150ms/u)
      assert.equal(error.method, 'GET')
      assert.equal(error.url, `${url}/tx/txid`)
      if (sendHeaders) assert.equal(error.status, 200)
      return true
    })
  })
}

for (const [method, format, path, timeout] of [
  ['getTransactionHex', 'text', '/tx/txid/hex', 175],
  ['getTransactionRaw', 'binary', '/tx/txid/raw', 225]
]) {
  test(`${format} body-read timeout messages include the configured ${timeout}ms duration`, async (context) => {
    const { url } = await mockApi(context, (request, response) => {
      response.writeHead(200)
      response.flushHeaders()
      response.write('partial')
    })
    await assert.rejects(new MempoolClient({ url, timeout })[method]('txid'), (error) => {
      assert.ok(error instanceof MempoolApiError)
      assert.ok(error.cause instanceof Error)
      assert.equal(error.status, 200)
      assert.equal(error.statusText, 'OK')
      assert.equal(error.method, 'GET')
      assert.equal(error.url, `${url}${path}`)
      assert.equal(error.message, `Mempool GET ${url}${path} timed out after ${timeout}ms`)
      return true
    })
  })
}

test('the default timeout is 10000ms and successful requests clear it', async (context) => {
  const originalSetTimeout = globalThis.setTimeout
  const originalClearTimeout = globalThis.clearTimeout
  let timer
  let cleared
  context.mock.method(globalThis, 'setTimeout', (callback, duration) => {
    assert.equal(duration, 10000)
    timer = originalSetTimeout(callback, duration)
    return timer
  })
  context.mock.method(globalThis, 'clearTimeout', (value) => {
    cleared = value
    originalClearTimeout(value)
  })
  context.mock.method(globalThis, 'fetch', async () => Response.json({ ok: true }))
  await new MempoolClient({ url: 'http://localhost' }).getTransaction('txid')
  assert.equal(cleared, timer)
})

test('network errors preserve cause identity and clear their timer', async (context) => {
  const cause = new TypeError('simulated DNS failure', { cause: new Error('ENOTFOUND') })
  const clear = context.mock.method(globalThis, 'clearTimeout')
  context.mock.method(globalThis, 'fetch', async () => { throw cause })
  await assert.rejects(new MempoolClient({ url: 'http://localhost' }).getTipHash(), (error) => {
    assert.ok(error instanceof MempoolApiError)
    assert.equal(error.cause, cause)
    return true
  })
  assert.equal(clear.mock.callCount(), 1)
})
