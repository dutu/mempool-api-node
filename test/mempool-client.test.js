import assert from 'node:assert/strict'
import test from 'node:test'
import { MempoolClient, MempoolApiError } from 'mempool-api-node'
import { mockApi } from './helpers.js'

for (const url of ['http://127.0.0.1:3002', 'http://electrs.internal:3002', 'https://bitcoin.example.com/api']) {
  test(`accepts ${url}`, () => {
    assert.ok(new MempoolClient({ url }) instanceof MempoolClient)
  })
}

for (const options of [
  undefined, null, [], 'url', {}, { url: '' }, { url: '  ' }, { url: 123 }, { url: 'not a url' },
  { url: '/relative' }, { url: 'http://[' }, { url: 'http://example.com:99999' },
  ...['ftp:', 'file:', 'ws:', 'wss:'].map((protocol) => ({ url: `${protocol}//example.com` })),
  ...['https://user:password@example.com', 'https://example.com?token=a', 'https://example.com/#part'].map((url) => ({ url })),
  ...[0, -1, 1.5, '1000', null, NaN, Infinity, 2147483648].map((timeout) => ({ url: 'http://localhost', timeout })),
  ...[null, [], 'token', new Headers(), new Date(), { Authorization: 1 }, { 'Invalid Header': 'x' }, { Authorization: 'a\nb' }].map((headers) => ({ url: 'http://localhost', headers }))
]) {
  test(`rejects invalid constructor options ${JSON.stringify(options)}`, () => {
    assert.throws(() => new MempoolClient(options), TypeError)
  })
}

const object = { field: 'unchanged', extra: { server: true } }
const array = [{ txid: 'transaction', value: 123 }]
const endpoints = [
  ['getAddress', ['address'], '/address/address', object],
  ['getAddressTransactions', ['address'], '/address/address/txs', array],
  ['getAddressTransactions', ['address', 'previous'], '/address/address/txs?after_txid=previous', array],
  ['getAddressUtxos', ['address'], '/address/address/utxo', array],
  ['getTransaction', ['txid'], '/tx/txid', object],
  ['getTransactionStatus', ['txid'], '/tx/txid/status', object],
  ['getTransactionHex', ['txid'], '/tx/txid/hex', 'raw hex\n'],
  ['getTransactionOutspends', ['txid'], '/tx/txid/outspends', array],
  ['getTransactionOutspend', ['txid', 0], '/tx/txid/outspend/0', object],
  ['broadcastTransaction', ['not locally decoded hex'], '/tx', 'returned txid\n'],
  ['getBlock', ['hash'], '/block/hash', object],
  ['getBlockStatus', ['hash'], '/block/hash/status', object],
  ['getBlockTransactions', ['hash'], '/block/hash/txs', array],
  ['getBlockTransactions', ['hash', 0], '/block/hash/txs/0', array],
  ['getBlockTransactions', ['hash', 25], '/block/hash/txs/25', array],
  ['getBlockHash', [0], '/block-height/0', 'block hash'],
  ['getTipHeight', [], '/blocks/tip/height', '876543'],
  ['getTipHash', [], '/blocks/tip/hash', 'tip hash']
]

for (const [method, args, path, result] of endpoints) {
  test(`${method}(${args.join(', ')}) maps to ${path} and preserves its response`, async (context) => {
    const { url, calls } = await mockApi(context, (request, response) => {
      response.end(typeof result === 'object' ? JSON.stringify(result) : String(result))
    })
    const client = new MempoolClient({ url: `${url}/api/` })
    assert.deepEqual(await client[method](...args), result)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].path, `/api${path}`)
    assert.equal(calls[0].method, method === 'broadcastTransaction' ? 'POST' : 'GET')
    assert.equal(calls[0].headers.accept, 'application/json')
    assert.equal(calls[0].body, method === 'broadcastTransaction' ? args[0] : '')
    if (method === 'broadcastTransaction') assert.equal(calls[0].headers['content-type'], 'text/plain')
  })
}

for (const prefix of ['', '/', '///', '/api', '/api/', '/api///', '/reverse/proxy/api/', '/prefix%20with%20spaces']) {
  test(`preserves and normalizes base prefix ${JSON.stringify(prefix)}`, async (context) => {
    const { url, calls } = await mockApi(context)
    await new MempoolClient({ url: `${url}${prefix}` }).getTransaction('123')
    assert.equal(calls[0].path, `${prefix.replace(/\/+$/u, '')}/tx/123`)
  })
}

test('HTTPS URL joining preserves /api with the exact requested host', async (context) => {
  const calls = []
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return Response.json({ txid: '123' })
  })
  await new MempoolClient({ url: 'https://example.com/api' }).getTransaction('123')
  assert.equal(calls[0].url, 'https://example.com/api/tx/123')
  assert.equal(calls[0].options.redirect, 'manual')
  assert.ok(calls[0].options.signal instanceof AbortSignal)
})

test('encodes each dynamic segment once without changing the base prefix', async (context) => {
  const { url, calls } = await mockApi(context)
  const client = new MempoolClient({ url: `${url}/api` })
  const value = 'a/b?c#d% é'
  const encoded = encodeURIComponent(value)
  await client.getAddress(value)
  await client.getAddressTransactions(value, value)
  await client.getTransaction(value)
  await client.getBlock(value)
  await client.getTransaction('%2e%2e')
  assert.deepEqual(calls.map((call) => call.path), [
    `/api/address/${encoded}`, `/api/address/${encoded}/txs?after_txid=a%2Fb%3Fc%23d%25+%C3%A9`,
    `/api/tx/${encoded}`, `/api/block/${encoded}`, '/api/tx/%252e%252e'
  ])
})

test('merges headers case-insensitively and snapshots connection settings', async (context) => {
  const { url, calls } = await mockApi(context, (request, response) => {
    response.end(request.method === 'POST' ? 'txid' : '{}')
  })
  const options = { url, timeout: 10000, headers: { accept: 'custom/type', Authorization: 'Bearer token', 'content-type': 'custom/type' } }
  const client = new MempoolClient(options)
  options.url = 'http://invalid.invalid'
  options.timeout = 1
  options.headers.Authorization = 'changed'
  await client.getTransaction('txid')
  await client.broadcastTransaction(' raw hex ')
  for (const call of calls) {
    assert.equal(call.headers.authorization, 'Bearer token')
    assert.equal(call.headers.accept, 'custom/type')
  }
  assert.equal(calls[0].headers['content-type'], 'custom/type')
  assert.equal(calls[1].headers['content-type'], 'text/plain')
  assert.equal(calls[1].body, ' raw hex ')
})

test('all string parameters reject empty or invalid values before fetching', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected fetch') })
  const client = new MempoolClient({ url: 'http://localhost' })
  const methods = [
    'getAddress', 'getAddressTransactions', 'getAddressUtxos', 'getTransaction', 'getTransactionStatus',
    'getTransactionHex', 'getTransactionOutspends', 'getTransactionOutspend', 'getBlock', 'getBlockStatus', 'getBlockTransactions'
  ]
  for (const method of methods) {
    for (const value of [undefined, null, '', '  ', 123, [], '.', '..', '\ud800']) {
      await assert.rejects(client[method](value, method === 'getTransactionOutspend' ? 0 : undefined), TypeError)
    }
  }
  for (const value of [null, '', ' ', 123]) {
    await assert.rejects(client.getAddressTransactions('address', value), TypeError)
    await assert.rejects(client.broadcastTransaction(value), TypeError)
  }
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('integer parameters reject negative, fractional, unsafe and nonnumeric values', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected fetch') })
  const client = new MempoolClient({ url: 'http://localhost' })
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '0', null]) {
    await assert.rejects(client.getTransactionOutspend('txid', value), TypeError)
    await assert.rejects(client.getBlockHash(value), TypeError)
    await assert.rejects(client.getBlockTransactions('hash', value), TypeError)
  }
  await assert.rejects(client.getTransactionOutspend('txid'), TypeError)
  await assert.rejects(client.getBlockHash(), TypeError)
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('does not enforce server-specific block page offsets', async (context) => {
  const { url, calls } = await mockApi(context, (request, response) => response.end('[]'))
  await new MempoolClient({ url }).getBlockTransactions('hash', 1)
  assert.equal(calls[0].path, '/block/hash/txs/1')
})

test('independent requests can complete while another request is still pending', async (context) => {
  let release
  const pending = new Promise((resolve) => { release = resolve })
  context.after(release)
  const { url } = await mockApi(context, async (request, response) => {
    if (request.url === '/tx/slow') await pending
    response.end(JSON.stringify({ path: request.url }))
  })
  const client = new MempoolClient({ url })
  const slow = client.getTransaction('slow')
  assert.deepEqual(await client.getTransaction('fast'), { path: '/tx/fast' })
  release()
  assert.deepEqual(await slow, { path: '/tx/slow' })
})

for (const payload of [null, false, 0, '', [], { future: [1, true] }]) {
  test(`passes through JSON ${JSON.stringify(payload)} without schema validation`, async (context) => {
    const { url } = await mockApi(context, (request, response) => response.end(JSON.stringify(payload)))
    assert.deepEqual(await new MempoolClient({ url }).getTransaction('txid'), payload)
  })
}

test('exports an Error subclass that preserves causes and available context', () => {
  const cause = new Error('original')
  const error = new MempoolApiError('failure', { cause, method: 'GET', status: 500, body: 'raw' })
  assert.ok(error instanceof Error)
  assert.equal(error.name, 'MempoolApiError')
  assert.equal(error.cause, cause)
  assert.equal(error.method, 'GET')
  assert.equal(error.status, 500)
  assert.equal(error.body, 'raw')
  assert.equal(new MempoolApiError('failure').status, undefined)
})

for (const body of ['876543', '0', ' 123\n', '', ' ', 'abc', '1.5', '9007199254740992']) {
  test(`returns tip height text unchanged: ${JSON.stringify(body)}`, async (context) => {
    const { url } = await mockApi(context, (request, response) => response.end(body))
    assert.equal(await new MempoolClient({ url }).getTipHeight(), body)
  })
}
