import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'
import { MempoolClient, MempoolApiError } from 'mempool-api-node'
import { mockApi } from './helpers.js'

// Expected routes checked against the public REST reference and backend handlers.
const endpoints = [
  ['getDifficultyAdjustment', [], '/v1/difficulty-adjustment'],
  ['getPrices', [], '/v1/prices'],
  ['getHistoricalPrice', [], '/v1/historical-price'],
  ['getHistoricalPrice', [{}], '/v1/historical-price'],
  ['getHistoricalPrice', [{ currency: 'EUR', timestamp: 0 }], '/v1/historical-price?currency=EUR&timestamp=0'],
  ['getHistoricalPrice', [{ timestamp: 1500000000 }], '/v1/historical-price?timestamp=1500000000'],
  ['getAddressTransactionsChain', ['address'], '/address/address/txs/chain', 'array'],
  ['getAddressTransactionsChain', ['address', 'previous'], '/address/address/txs/chain/previous', 'array'],
  ['getAddressTransactionsMempool', ['address'], '/address/address/txs/mempool', 'array'],
  ['validateAddress', ['address'], '/v1/validate-address/address'],
  ['getBlockV1', ['hash'], '/v1/block/hash'],
  ['getBlockHeader', ['hash'], '/block/hash/header', 'text'],
  ['getBlockTimestamp', [0], '/v1/mining/blocks/timestamp/0'],
  ['getBlockRaw', ['hash'], '/block/hash/raw', 'binary'],
  ['getBlockTransactionId', ['hash', 0], '/block/hash/txid/0', 'text'],
  ['getBlockTransactionIds', ['hash'], '/block/hash/txids', 'array'],
  ['getBlocks', [], '/blocks', 'array'],
  ['getBlocks', [0], '/blocks/0', 'array'],
  ['getBlocksV1', [], '/v1/blocks', 'array'],
  ['getBlocksV1', [0], '/v1/blocks/0', 'array'],
  ['getBlocksBulk', [0], '/v1/blocks-bulk/0', 'array'],
  ['getBlocksBulk', [0, 9], '/v1/blocks-bulk/0/9', 'array'],
  ['getBlocksBulk', [0, 0], '/v1/blocks-bulk/0/0', 'array'],
  ['getMiningPools', [], '/v1/mining/pools'],
  ['getMiningPools', ['1w'], '/v1/mining/pools/1w'],
  ['getMiningPool', ['pool'], '/v1/mining/pool/pool'],
  ['getMiningPoolHashrates', [], '/v1/mining/hashrate/pools', 'array'],
  ['getMiningPoolHashrates', ['1y'], '/v1/mining/hashrate/pools/1y', 'array'],
  ['getMiningPoolHashrate', ['pool'], '/v1/mining/pool/pool/hashrate', 'array'],
  ['getMiningPoolBlocks', ['pool'], '/v1/mining/pool/pool/blocks', 'array'],
  ['getMiningPoolBlocks', ['pool', 0], '/v1/mining/pool/pool/blocks/0', 'array'],
  ['getHashrate', [], '/v1/mining/hashrate'],
  ['getHashrate', ['1y'], '/v1/mining/hashrate/1y'],
  ['getDifficultyAdjustments', [], '/v1/mining/difficulty-adjustments', 'array'],
  ['getDifficultyAdjustments', ['1y'], '/v1/mining/difficulty-adjustments/1y', 'array'],
  ['getRewardStats', [0], '/v1/mining/reward-stats/0'],
  ['getBlockFees', ['1w'], '/v1/mining/blocks/fees/1w', 'array'],
  ['getBlockRewards', ['1w'], '/v1/mining/blocks/rewards/1w', 'array'],
  ['getBlockFeeRates', ['1w'], '/v1/mining/blocks/fee-rates/1w', 'array'],
  ['getBlockFeeRatesPrecise', ['1w'], '/v1/mining/blocks/fee-rates/1w/precise', 'array'],
  ['getBlockSizesWeights', ['1w'], '/v1/mining/blocks/sizes-weights/1w'],
  ['getBlockPredictions', ['1w'], '/v1/mining/blocks/predictions/1w', 'array'],
  ['getBlockAuditScore', ['hash'], '/v1/mining/blocks/audit/score/hash'],
  ['getBlocksAuditScores', [], '/v1/mining/blocks/audit/scores', 'array'],
  ['getBlocksAuditScores', [0], '/v1/mining/blocks/audit/scores/0', 'array'],
  ['getBlockAuditSummary', ['hash'], '/v1/block/hash/audit-summary'],
  ['getMempoolBlocksFees', [], '/v1/fees/mempool-blocks', 'array'],
  ['getRecommendedFees', [], '/v1/fees/recommended'],
  ['getRecommendedFeesPrecise', [], '/v1/fees/precise'],
  ['getMempool', [], '/mempool'],
  ['getMempoolTransactionIds', [], '/mempool/txids', 'array'],
  ['getMempoolRecent', [], '/mempool/recent', 'array'],
  ['getMempoolRbfTransactions', [], '/v1/replacements', 'array'],
  ['getMempoolFullRbfTransactions', [], '/v1/fullrbf/replacements', 'array'],
  ['getTransactionCpfp', ['txid'], '/v1/cpfp/txid'],
  ['getTransactionMerkleblockProof', ['txid'], '/tx/txid/merkleblock-proof', 'text'],
  ['getTransactionMerkleProof', ['txid'], '/tx/txid/merkle-proof'],
  ['getTransactionRaw', ['txid'], '/tx/txid/raw', 'binary'],
  ['getTransactionRbfTimeline', ['txid'], '/v1/tx/txid/rbf'],
  ['getTransactionTimes', [['first', 'second']], '/v1/transaction-times?txId%5B%5D=first&txId%5B%5D=second', 'array']
]

for (const [method, args, path, format = 'json'] of endpoints) {
  test(`${method}(${JSON.stringify(args)}) requests ${path}`, async (context) => {
    const result = {
      json: { value: 0.123, extra: { unchanged: true } },
      array: [{ value: 0.123, extra: true }],
      text: '  raw text\n',
      binary: Buffer.from([0, 255, 128, 195, 40, 0, 10])
    }[format]
    const { url, calls } = await mockApi(context, (request, response) => {
      response.end(format === 'json' || format === 'array' ? JSON.stringify(result) : result)
    })
    const actual = await new MempoolClient({ url: `${url}/reverse/api/` })[method](...args)
    if (format === 'binary') {
      assert.ok(actual instanceof ArrayBuffer)
      assert.deepEqual(Buffer.from(actual), result)
    } else {
      assert.deepEqual(actual, result)
    }
    assert.equal(calls.length, 1)
    assert.equal(calls[0].path, `/reverse/api${path}`)
    assert.equal(calls[0].method, 'GET')
    assert.equal(calls[0].headers.accept, 'application/json')
    assert.equal(calls[0].body, '')
  })
}

test('encodes string parameters and repeated queries while preserving values and order', async (context) => {
  const { url, calls } = await mockApi(context)
  const client = new MempoolClient({ url: `${url}/api` })
  const value = 'a/b?c#d% é+&'
  const encoded = encodeURIComponent(value)
  await client.getMiningPool(value)
  await client.getMiningPools(value)
  await client.getBlockAuditSummary(value)
  await client.getAddressTransactionsChain(value, value)
  await client.getHistoricalPrice({ currency: value, timestamp: 0 })
  const txids = Object.freeze([value, '%2F', value])
  await client.getTransactionTimes(txids)
  assert.deepEqual(calls.slice(0, 4).map((call) => call.path), [
    `/api/v1/mining/pool/${encoded}`, `/api/v1/mining/pools/${encoded}`,
    `/api/v1/block/${encoded}/audit-summary`, `/api/address/${encoded}/txs/chain/${encoded}`
  ])
  const historical = new URL(calls[4].path, url)
  assert.equal(historical.pathname, '/api/v1/historical-price')
  assert.equal(historical.searchParams.get('currency'), value)
  assert.equal(historical.searchParams.get('timestamp'), '0')
  const times = new URL(calls[5].path, url)
  assert.equal(times.pathname, '/api/v1/transaction-times')
  assert.deepEqual(times.searchParams.getAll('txId[]'), txids)
})

test('historical-price options omit undefined values and preserve caller settings', async (context) => {
  const { url, calls } = await mockApi(context)
  const options = Object.freeze({ currency: undefined, timestamp: undefined })
  await new MempoolClient({ url }).getHistoricalPrice(options)
  assert.equal(calls[0].path, '/v1/historical-price')
})

test('new string arguments reject invalid values before a request', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected fetch') })
  const client = new MempoolClient({ url: 'http://localhost' })
  const methods = [
    'getAddressTransactionsChain', 'getAddressTransactionsMempool', 'validateAddress',
    'getBlockV1', 'getBlockHeader', 'getBlockRaw', 'getBlockTransactionIds',
    'getMiningPool', 'getMiningPoolHashrate', 'getMiningPoolBlocks', 'getBlockAuditScore',
    'getBlockAuditSummary', 'getTransactionCpfp', 'getTransactionMerkleblockProof',
    'getTransactionMerkleProof', 'getTransactionRaw', 'getTransactionRbfTimeline',
    'getBlockFees', 'getBlockRewards', 'getBlockFeeRates', 'getBlockFeeRatesPrecise', 'getBlockSizesWeights', 'getBlockPredictions'
  ]
  for (const method of methods) {
    for (const value of [undefined, null, '', ' ', 1, [], '.', '..', '\ud800']) {
      await assert.rejects(client[method](value), TypeError)
    }
  }
  for (const value of [null, '', ' ', 1, '.', '..', '\ud800']) {
    await assert.rejects(client.getAddressTransactionsChain('address', value), TypeError)
    for (const method of ['getMiningPools', 'getMiningPoolHashrates', 'getHashrate', 'getDifficultyAdjustments']) {
      await assert.rejects(client[method](value), TypeError)
    }
  }
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('new numeric arguments validate required and optional values', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected fetch') })
  const client = new MempoolClient({ url: 'http://localhost' })
  for (const value of [-1, 0.5, '0', null, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    for (const method of ['getBlockTimestamp', 'getRewardStats', 'getBlocks', 'getBlocksV1', 'getBlocksBulk', 'getBlocksAuditScores']) {
      await assert.rejects(client[method](value), TypeError)
    }
    await assert.rejects(client.getBlockTransactionId('hash', value), TypeError)
    await assert.rejects(client.getBlocksBulk(0, value), TypeError)
    await assert.rejects(client.getMiningPoolBlocks('pool', value), TypeError)
    await assert.rejects(client.getHistoricalPrice({ timestamp: value }), TypeError)
  }
  for (const method of ['getBlockTimestamp', 'getRewardStats', 'getBlocksBulk']) {
    await assert.rejects(client[method](), TypeError)
  }
  await assert.rejects(client.getBlockTransactionId('hash'), TypeError)
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('historical price options and transaction ID arrays reject invalid inputs', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected fetch') })
  const client = new MempoolClient({ url: 'http://localhost' })
  for (const value of [null, [], 'EUR', 123]) await assert.rejects(client.getHistoricalPrice(value), TypeError)
  for (const value of [null, '', ' ', 123, []]) await assert.rejects(client.getHistoricalPrice({ currency: value }), TypeError)
  for (const value of [undefined, null, [], 'txid', [null], [''], [' '], ['first', 123], new Array(1)]) {
    await assert.rejects(client.getTransactionTimes(value), TypeError)
  }
  assert.equal(fetchMock.mock.callCount(), 0)
})

for (const method of ['getBlockRaw', 'getTransactionRaw']) {
  test(`${method} preserves an empty binary response`, async (context) => {
    const { url } = await mockApi(context, (request, response) => response.end())
    const body = await new MempoolClient({ url })[method]('id')
    assert.ok(body instanceof ArrayBuffer)
    assert.equal(body.byteLength, 0)
  })

  test(`${method} preserves plain-text HTTP errors`, async (context) => {
    const { url } = await mockApi(context, (request, response) => {
      response.writeHead(404)
      response.end('not found')
    })
    await assert.rejects(new MempoolClient({ url })[method]('id'), (error) => {
      assert.ok(error instanceof MempoolApiError)
      assert.equal(error.status, 404)
      assert.equal(error.statusText, 'Not Found')
      assert.equal(error.method, 'GET')
      assert.equal(error.url, `${url}/${method === 'getBlockRaw' ? 'block' : 'tx'}/id/raw`)
      assert.equal(error.body, 'not found')
      return true
    })
  })

  test(`${method} wraps a truncated binary body with its HTTP context`, async (context) => {
    const { url } = await mockApi(context, (request, response) => {
      response.writeHead(200, { 'Content-Length': '100', Connection: 'close' })
      response.end(Buffer.from([0, 255]))
    })
    await assert.rejects(new MempoolClient({ url })[method]('id'), (error) => {
      assert.ok(error instanceof MempoolApiError)
      assert.equal(error.status, 200)
      assert.ok(error.cause instanceof Error)
      assert.match(error.message, /request failed/u)
      return true
    })
  })

  test(`${method} times out while reading binary data`, async (context) => {
    const { url } = await mockApi(context, (request, response) => {
      response.writeHead(200)
      response.flushHeaders()
      response.write(Buffer.from([0, 255]))
    })
    await assert.rejects(new MempoolClient({ url, timeout: 150 })[method]('id'), (error) => {
      assert.ok(error instanceof MempoolApiError)
      assert.equal(error.status, 200)
      assert.ok(error.cause instanceof Error)
      assert.match(error.message, /timed out after 150ms/u)
      return true
    })
  })
}
