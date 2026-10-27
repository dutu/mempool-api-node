# mempool-api-node

[![CI](https://github.com/dutu/mempool-api-node/actions/workflows/ci.yml/badge.svg)](https://github.com/dutu/mempool-api-node/actions/workflows/ci.yml)

A small, unofficial Node.js client for the Mempool HTTP API. Requires
**Node.js >= 22**.

Provides 60 documented Bitcoin REST endpoints.
Base address, transaction, block and mempool endpoints work with self-hosted
`mempool/electrs` and compatible servers, including Blockstream servers. Extended
`/v1` methods require Mempool's backend and any relevant indexing features.
Uses Node's built-in `fetch` and has no runtime dependencies.

The library is intentionally thin: JSON fields and values are preserved, and text
is returned unchanged. Bitcoin validation, transaction analysis, caching, and
wallet logic belong in the calling application.

For server setup, endpoint definitions and response fields, see the
[official Mempool API documentation](https://mempool.space/docs/api/rest).

## Installation

Using npm:

```sh
npm install mempool-api-node
```

Using Yarn:

```sh
yarn add mempool-api-node
```

## Usage

Connect to a local HTTP server:

```js
import { MempoolClient } from 'mempool-api-node'

const client = new MempoolClient({
  url: 'http://127.0.0.1:3002'
})

const height = await client.getTipHeight()
const hash = await client.getTipHash()

console.log(height, hash)
```

Connect over HTTPS, including a custom API path:

```js
import { MempoolClient } from 'mempool-api-node'

const client = new MempoolClient({
  url: 'https://bitcoin.example.com/api'
})

const block = await client.getBlock(await client.getTipHash())
console.log(block)
```

The `/api` prefix is preserved on every request. For example,
`getTransaction('123')` requests `https://bitcoin.example.com/api/tx/123`.
Trailing slashes are normalized, so `/api` and `/api/` behave identically.
The client uses the configured protocol without separate HTTP/HTTPS settings.

## Connection options

Pass these settings to `new MempoolClient({ ... })`:

| Option | Default | Description |
| --- | --- | --- |
| `url` | No default | Required non-empty HTTP or HTTPS API URL, including any port or path prefix. URL credentials, query strings and fragments are rejected. |
| `timeout` | `10000` | Integer from 1 to 2147483647, in milliseconds. Covers fetching and reading the complete response body. |
| `headers` | `{}` | Object with string header values, copied when the client is constructed. Names are case-insensitive. `Accept: application/json` is added unless supplied by the caller. |

Connection settings are immutable. Use a new client to change them.
Authentication can be supplied through headers:

```js
const client = new MempoolClient({
  url: 'https://bitcoin.example.com/api/',
  timeout: 20000,
  headers: {
    Authorization: 'Bearer token',
    Accept: 'application/json'
  }
})
```

HTTPS uses Node's normal certificate verification. For a private certificate
authority, see the [TLS guide](./docs/tls.md).

## Implemented API methods

All methods return promises. JSON responses are parsed without schema validation.

### General

| Method | API documentation | Response |
| --- | --- | --- |
| `getDifficultyAdjustment()` | [GET Difficulty Adjustment](https://mempool.space/docs/api/rest#get-difficulty-adjustment) | JSON |
| `getPrices()` | [GET Price](https://mempool.space/docs/api/rest#get-price) | JSON |
| `getHistoricalPrice(options?)` | [GET Historical Price](https://mempool.space/docs/api/rest#get-historical-price) | JSON |

### Addresses

| Method | API documentation | Response |
| --- | --- | --- |
| `getAddress(address)` | [GET Address](https://mempool.space/docs/api/rest#get-address) | JSON |
| `getAddressTransactions(address, afterTxid?)` | [GET Address Transactions](https://mempool.space/docs/api/rest#get-address-transactions) | JSON array |
| `getAddressUtxos(address)` | [GET Address UTXO](https://mempool.space/docs/api/rest#get-address-utxo) | JSON array |
| `getAddressTransactionsChain(address, afterTxid?)` | [GET Address Transactions Chain](https://mempool.space/docs/api/rest#get-address-transactions-chain) | JSON array |
| `getAddressTransactionsMempool(address)` | [GET Address Transactions Mempool](https://mempool.space/docs/api/rest#get-address-transactions-mempool) | JSON array |
| `validateAddress(address)` | [GET Address Validation](https://mempool.space/docs/api/rest#get-address-validate) | JSON |

### Blocks

| Method | API documentation | Response |
| --- | --- | --- |
| `getBlock(hash)` | [GET Block](https://mempool.space/docs/api/rest#get-block) | JSON |
| `getBlockStatus(hash)` | [GET Block Status](https://mempool.space/docs/api/rest#get-block-status) | JSON |
| `getBlockTransactions(hash, startIndex?)` | [GET Block Transactions](https://mempool.space/docs/api/rest#get-block-transactions) | JSON array |
| `getBlockHash(height)` | [GET Block Height](https://mempool.space/docs/api/rest#get-block-height) | String |
| `getTipHeight()` | [GET Block Tip Height](https://mempool.space/docs/api/rest#get-block-tip-height) | String |
| `getTipHash()` | [GET Block Tip Hash](https://mempool.space/docs/api/rest#get-block-tip-hash) | String |
| `getBlockV1(hash)` | [GET Block (v1)](https://mempool.space/docs/api/rest#get-block-v1) | JSON |
| `getBlockHeader(hash)` | [GET Block Header](https://mempool.space/docs/api/rest#get-block-header) | String |
| `getBlockTimestamp(timestamp)` | [GET Block Timestamp](https://mempool.space/docs/api/rest#get-block-timestamp) | JSON |
| `getBlockRaw(hash)` | [GET Block Raw](https://mempool.space/docs/api/rest#get-block-raw) | ArrayBuffer |
| `getBlockTransactionId(hash, index)` | [GET Block Transaction ID](https://mempool.space/docs/api/rest#get-block-transaction-id) | String |
| `getBlockTransactionIds(hash)` | [GET Block Transaction IDs](https://mempool.space/docs/api/rest#get-block-transaction-ids) | JSON array |
| `getBlocks(startHeight?)` | [GET Blocks](https://mempool.space/docs/api/rest#get-blocks) | JSON array |
| `getBlocksV1(startHeight?)` | [GET Blocks (v1)](https://mempool.space/docs/api/rest#get-blocks-v1) | JSON array |
| `getBlocksBulk(minHeight, maxHeight?)` | [GET Blocks (Bulk)](https://mempool.space/docs/api/rest#get-blocks-bulk) | JSON array |

### Mining

| Method | API documentation | Response |
| --- | --- | --- |
| `getMiningPools(timePeriod?)` | [GET Mining Pools](https://mempool.space/docs/api/rest#get-mining-pools) | JSON |
| `getMiningPool(slug)` | [GET Mining Pool](https://mempool.space/docs/api/rest#get-mining-pool) | JSON |
| `getMiningPoolHashrates(timePeriod?)` | [GET Mining Pool Hashrates](https://mempool.space/docs/api/rest#get-mining-pool-hashrates) | JSON array |
| `getMiningPoolHashrate(slug)` | [GET Mining Pool Hashrate](https://mempool.space/docs/api/rest#get-mining-pool-hashrate) | JSON array |
| `getMiningPoolBlocks(slug, blockHeight?)` | [GET Mining Pool Blocks](https://mempool.space/docs/api/rest#get-mining-pool-blocks) | JSON array |
| `getHashrate(timePeriod?)` | [GET Hashrate](https://mempool.space/docs/api/rest#get-hashrate) | JSON |
| `getDifficultyAdjustments(interval?)` | [GET Difficulty Adjustments](https://mempool.space/docs/api/rest#get-difficulty-adjustments) | JSON array |
| `getRewardStats(blockCount)` | [GET Reward Stats](https://mempool.space/docs/api/rest#get-reward-stats) | JSON |
| `getBlockFees(timePeriod)` | [GET Block Fees](https://mempool.space/docs/api/rest#get-block-fees) | JSON array |
| `getBlockRewards(timePeriod)` | [GET Block Rewards](https://mempool.space/docs/api/rest#get-block-rewards) | JSON array |
| `getBlockFeeRates(timePeriod)` | [GET Block Feerates](https://mempool.space/docs/api/rest#get-block-feerates) | JSON array |
| `getBlockFeeRatesPrecise(timePeriod)` | [GET Block Feerates (Precise)](https://mempool.space/docs/api/rest#get-block-feerates-precise) | JSON array |
| `getBlockSizesWeights(timePeriod)` | [GET Block Sizes and Weights](https://mempool.space/docs/api/rest#get-sizes-weights) | JSON |
| `getBlockPredictions(timePeriod)` | [GET Block Predictions](https://mempool.space/docs/api/rest#get-block-predictions) | JSON array |
| `getBlockAuditScore(hash)` | [GET Block Audit Score](https://mempool.space/docs/api/rest#get-block-audit-score) | JSON |
| `getBlocksAuditScores(startHeight?)` | [GET Blocks Audit Scores](https://mempool.space/docs/api/rest#get-blocks-audit-scores) | JSON array |
| `getBlockAuditSummary(hash)` | [GET Block Audit Summary](https://mempool.space/docs/api/rest#get-block-audit-summary) | JSON |

### Fees

| Method | API documentation | Response |
| --- | --- | --- |
| `getMempoolBlocksFees()` | [GET Mempool Blocks Fees](https://mempool.space/docs/api/rest#get-mempool-blocks-fees) | JSON array |
| `getRecommendedFees()` | [GET Recommended Fees](https://mempool.space/docs/api/rest#get-recommended-fees) | JSON |
| `getRecommendedFeesPrecise()` | [GET Recommended Fees (Precise)](https://mempool.space/docs/api/rest#get-recommended-fees-precise) | JSON |

### Mempool

| Method | API documentation | Response |
| --- | --- | --- |
| `getMempool()` | [GET Mempool](https://mempool.space/docs/api/rest#get-mempool) | JSON |
| `getMempoolTransactionIds()` | [GET Mempool Transaction IDs](https://mempool.space/docs/api/rest#get-mempool-transaction-ids) | JSON array |
| `getMempoolRecent()` | [GET Mempool Recent](https://mempool.space/docs/api/rest#get-mempool-recent) | JSON array |
| `getMempoolRbfTransactions()` | [GET Mempool RBF Transactions](https://mempool.space/docs/api/rest#get-mempool-rbf) | JSON array |
| `getMempoolFullRbfTransactions()` | [GET Mempool Full RBF Transactions](https://mempool.space/docs/api/rest#get-mempool-fullrbf) | JSON array |

### Transactions

| Method | API documentation | Response |
| --- | --- | --- |
| `getTransaction(txid)` | [GET Transaction](https://mempool.space/docs/api/rest#get-transaction) | JSON |
| `getTransactionStatus(txid)` | [GET Transaction Status](https://mempool.space/docs/api/rest#get-transaction-status) | JSON |
| `getTransactionHex(txid)` | [GET Transaction Hex](https://mempool.space/docs/api/rest#get-transaction-hex) | String |
| `getTransactionOutspends(txid)` | [GET Transaction Outspends](https://mempool.space/docs/api/rest#get-transaction-outspends) | JSON array |
| `getTransactionOutspend(txid, vout)` | [GET Transaction Outspend](https://mempool.space/docs/api/rest#get-transaction-outspend) | JSON |
| `broadcastTransaction(hex)` | [POST Transaction](https://mempool.space/docs/api/rest#post-transaction) | String |
| `getTransactionCpfp(txid)` | [GET Children Pay for Parent](https://mempool.space/docs/api/rest#get-cpfp) | JSON |
| `getTransactionMerkleblockProof(txid)` | [GET Transaction Merkleblock Proof](https://mempool.space/docs/api/rest#get-transaction-merkleblock-proof) | String |
| `getTransactionMerkleProof(txid)` | [GET Transaction Merkle Proof](https://mempool.space/docs/api/rest#get-transaction-merkle-proof) | JSON |
| `getTransactionRaw(txid)` | [GET Transaction Raw](https://mempool.space/docs/api/rest#get-transaction-raw) | ArrayBuffer |
| `getTransactionRbfTimeline(txid)` | [GET Transaction RBF Timeline](https://mempool.space/docs/api/rest#get-transaction-rbf-timeline) | JSON |
| `getTransactionTimes(txids)` | [GET Transaction Times](https://mempool.space/docs/api/rest#get-transaction-times) | JSON array |

Required string arguments must be non-empty; path arguments are automatically
encoded and cannot be literal `.` or `..` segments. Addresses, transaction IDs,
block hashes, and transaction hex are otherwise passed through without Bitcoin
format validation. Numeric heights, timestamps, counts and indices must be non-negative safe
integers. Optional time periods must be non-empty strings when supplied. Only `undefined` omits an optional argument.

## Address lookup and pagination

```js
const address = 'your-bitcoin-address'
const info = await client.getAddress(address)
const utxos = await client.getAddressUtxos(address)
const firstPage = await client.getAddressTransactions(address)

// Choose the last confirmed transaction; the initial page can include mempool transactions.
const confirmed = firstPage.filter((transaction) => transaction.status.confirmed)
const lastConfirmed = confirmed.at(-1)

if (lastConfirmed) {
  const nextPage = await client.getAddressTransactionsChain(address, lastConfirmed.txid)
  console.log(nextPage)
}

console.log(info, utxos)
```

`getAddressTransactions(address, afterTxid)` uses the mixed-history endpoint
with an `after_txid` query parameter. `getAddressTransactionsChain(address,
afterTxid)` uses confirmed-only history and a path cursor. This changes the
previous behavior of the second argument to `getAddressTransactions()`; callers
that want confirmed pages should use `getAddressTransactionsChain()`.

`getAddressTransactionsMempool(address)` returns unconfirmed transactions only.
Each call makes one request; pagination and the decision to stop belong to the caller.

## Transaction lookup and outspends

```js
const txid = 'your-transaction-id'
const transaction = await client.getTransaction(txid)
const status = await client.getTransactionStatus(txid)
const hex = await client.getTransactionHex(txid)
const outspends = await client.getTransactionOutspends(txid)
const firstOutput = await client.getTransactionOutspend(txid, 0)

console.log(transaction, status, hex, outspends, firstOutput)
```

Outspends expose the server's output spending information for callers that
perform forward transaction traversal. The wrapper does not traverse a graph.

## Block lookup

```js
const hash = await client.getBlockHash(800000)
const block = await client.getBlock(hash)
const status = await client.getBlockStatus(hash)
const firstPage = await client.getBlockTransactions(hash)
const nextPage = await client.getBlockTransactions(hash, 25)

console.log(block, status, firstPage, nextPage)
```

Block transaction pages contain up to 25 transactions and require
`startIndex` to be a multiple of 25. The client checks only that it is a
non-negative safe integer; the server enforces its pagination requirements.

## Recommended fees

```js
const fees = await client.getRecommendedFeesPrecise()
console.log(fees)
```

The server's fee values are preserved, including fractional values.
Fees are expressed in satoshis per virtual byte.

## Historical queries and binary data

```js
const prices = await client.getHistoricalPrice({ currency: 'EUR', timestamp: 1500000000 })
const times = await client.getTransactionTimes(['first-transaction-id', 'second-transaction-id'])
const rawTransaction = await client.getTransactionRaw('your-transaction-id')
const bytes = new Uint8Array(rawTransaction)
const rawBlock = await client.getBlockRaw(await client.getTipHash())

console.log(prices, times, bytes, rawBlock)
```

Query parameters are encoded automatically; only `undefined` omits a value.
`getTransactionTimes()` accepts a non-empty array of transaction ID strings and
sends repeated `txId[]` parameters in the supplied order. Historical price options
are optional; `timestamp` must be a non-negative safe integer and `currency` a
non-empty string.

## Mining and recommended fees

```js
const pools = await client.getMiningPools('1w')
const blocks = await client.getMiningPoolBlocks('your-pool-slug')
const hashrate = await client.getHashrate('1y')
const recommended = await client.getRecommendedFees()
const precise = await client.getRecommendedFeesPrecise()

console.log(pools, blocks, hashrate, recommended, precise)
```

Mining time periods are forwarded as strings. Supported periods, pagination
limits, available history and backend indexing requirements are enforced by the
server. Common periods include `24h`, `3d`, `1w`, `1m`, `3m`, `6m`, `1y`, `2y`,
and `3y`; consult each endpoint's documentation for its supported subset.

## Broadcasting

```js
const txid = await client.broadcastTransaction(rawTransactionHex)
console.log(txid)
```

The supplied string is sent unchanged to `POST /tx` with `Content-Type:
text/plain`, overriding any configured content type for this request. The
returned transaction ID is a string. The transaction is not decoded or
validated locally beyond requiring a non-empty string.

## Responses

JSON fields and values are preserved. Text is returned exactly as received,
including any whitespace. Raw block and raw transaction methods return
`ArrayBuffer` with the server's bytes unchanged. Callers handle any numeric
conversion, binary decoding or content validation they need.

JSON endpoints require a valid JSON body. Empty 2xx responses, including
`204 No Content`, raise `MempoolApiError`.

Requests execute independently. The client does not automatically paginate,
retry failed requests, or follow HTTP redirects. Non-2xx responses, including
redirects, throw `MempoolApiError`.

## Errors

```js
import { MempoolClient, MempoolApiError } from 'mempool-api-node'

const client = new MempoolClient({ url: 'http://127.0.0.1:3002' })

try {
  const transaction = await client.getTransaction('your-transaction-id')
  console.log(transaction)
} catch (error) {
  if (error instanceof MempoolApiError) {
    console.error(error.message)
    console.error(error.method, error.url, error.status, error.statusText)
    console.error(error.body, error.cause)
  } else {
    throw error
  }
}
```

| Error | When | Context |
| --- | --- | --- |
| `TypeError` | Invalid constructor options or method arguments | `message`, and `cause` where available |
| `MempoolApiError` | Non-2xx HTTP response | `status`, `statusText`, `method`, `url`, unparsed `body` |
| `MempoolApiError` | Timeout, connection, DNS, TLS or body-read failure | `method`, `url`, original `cause`; status details if headers were received |
| `MempoolApiError` | Malformed JSON | `method`, `url`, `status`, `statusText`, unparsed `body`; parsing `cause` for invalid JSON |

HTTP error bodies are retained as text, even when they contain JSON or HTML.
Timeout messages include the configured duration. Context properties are
available only when the request reached the corresponding stage.

The constructor validates synchronously. Public request methods reject their
promises for invalid arguments or request failures.

## TypeScript

TypeScript declarations are included. JSON schemas default to `unknown`; callers
can provide result types without changing runtime behavior. See the
[TypeScript guide](./docs/typescript.md) for typed results and error handling.

## Mempool server notes

Configure the URL of the server's HTTP API, including its exposed port or
reverse-proxy path. This package uses the Mempool HTTP API and does not implement
the Electrum TCP protocol. Lightning, accelerator and Liquid asset methods are
deferred to a later revision.

See the [official API reference](https://mempool.space/docs/api/rest)
for server response definitions. For development setup, architecture and tests,
see [CONTRIBUTING.md](https://github.com/dutu/mempool-api-node/blob/master/CONTRIBUTING.md).

## License

[MIT](./LICENSE)
