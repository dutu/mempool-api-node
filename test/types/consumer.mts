import { MempoolClient, MempoolApiError } from 'mempool-api-node'
import type { MempoolClientOptions, MempoolApiErrorOptions, MempoolHistoricalPriceOptions } from 'mempool-api-node'

const options: MempoolClientOptions = { url: 'http://127.0.0.1:3002', timeout: 10000, headers: { Authorization: 'Bearer token' } }
const client = new MempoolClient(options)
const json: Promise<unknown>[] = [
  client.getAddress('address'), client.getTransaction('txid'), client.getTransactionStatus('txid'),
  client.getTransactionOutspend('txid', 0), client.getBlock('hash'), client.getBlockStatus('hash')
]
const arrays: Promise<unknown[]>[] = [
  client.getAddressTransactions('address'), client.getAddressTransactions('address', 'txid'),
  client.getAddressUtxos('address'), client.getTransactionOutspends('txid'),
  client.getBlockTransactions('hash'), client.getBlockTransactions('hash', 25)
]
const strings: Promise<string>[] = [
  client.getTransactionHex('txid'), client.broadcastTransaction('hex'), client.getBlockHash(0), client.getTipHash()
]
const height: Promise<string> = client.getTipHeight()
// @ts-expect-error Tip height is unmodified text, not a numeric result.
const numericHeight: Promise<number> = client.getTipHeight()
interface Transaction { txid: string }
const transaction: Transaction = await client.getTransaction<Transaction>('txid')
const page: Transaction[] = await client.getAddressTransactions<Transaction>('address')
const fees: Record<string, number> = await client.getRecommendedFeesPrecise<Record<string, number>>()
const details: MempoolApiErrorOptions = { method: 'GET', url: options.url, status: 404, statusText: 'Not Found', body: 'missing', cause: new Error('failure') }
const error = new MempoolApiError('failure', details)
const status: number | undefined = error.status
const body: string | undefined = error.body
const cause: unknown = error.cause
new MempoolClient({ url: options.url, timeout: undefined, headers: undefined })
client.getAddressTransactions('address', undefined)
client.getBlockTransactions('hash', undefined)

// @ts-expect-error Connection settings are required.
new MempoolClient()
// @ts-expect-error A URL is required.
new MempoolClient({})
// @ts-expect-error Timeouts must be numbers.
new MempoolClient({ url: options.url, timeout: '100' })
// @ts-expect-error Header values must be strings.
new MempoolClient({ url: options.url, headers: { Authorization: 123 } })
// @ts-expect-error Addresses must be strings.
client.getAddress(123)
// @ts-expect-error Output indices must be numbers.
client.getTransactionOutspend('txid', '0')
// @ts-expect-error Block heights must be numbers.
client.getBlockHash('0')
// @ts-expect-error Raw transaction hex must be a string.
client.broadcastTransaction(123)
const unknownTransaction = await client.getTransaction('txid')
// @ts-expect-error JSON schemas default to unknown.
unknownTransaction.txid
// @ts-expect-error Internal transport is private.
client.request('/tx/txid')
// @ts-expect-error Package subpaths are not exported.
await import('mempool-api-node/src/mempool-client.js')

const expandedJson: Promise<unknown>[] = [
  client.getDifficultyAdjustment(),
  client.getPrices(),
  client.getHistoricalPrice({ currency: 'EUR', timestamp: 0 }),
  client.validateAddress('value'),
  client.getBlockV1('value'),
  client.getBlockTimestamp(0),
  client.getMiningPools('value'),
  client.getMiningPool('value'),
  client.getHashrate('value'),
  client.getRewardStats(0),
  client.getBlockSizesWeights('value'),
  client.getBlockAuditScore('value'),
  client.getBlockAuditSummary('value'),
  client.getRecommendedFees(),
  client.getRecommendedFeesPrecise(),
  client.getMempool(),
  client.getTransactionCpfp('value'),
  client.getTransactionMerkleProof('value'),
  client.getTransactionRbfTimeline('value')
]

const expandedArray: Promise<unknown[]>[] = [
  client.getAddressTransactionsChain('value', 'value'),
  client.getAddressTransactionsMempool('value'),
  client.getBlockTransactionIds('value'),
  client.getBlocks(0),
  client.getBlocksV1(0),
  client.getBlocksBulk(0, 0),
  client.getMiningPoolHashrates('value'),
  client.getMiningPoolHashrate('value'),
  client.getMiningPoolBlocks('value', 0),
  client.getDifficultyAdjustments('value'),
  client.getBlockFees('value'),
  client.getBlockRewards('value'),
  client.getBlockFeeRates('value'),
  client.getBlockFeeRatesPrecise('value'),
  client.getBlockPredictions('value'),
  client.getBlocksAuditScores(0),
  client.getMempoolBlocksFees(),
  client.getMempoolTransactionIds(),
  client.getMempoolRecent(),
  client.getMempoolRbfTransactions(),
  client.getMempoolFullRbfTransactions(),
  client.getTransactionTimes(['first', 'second'] as const)
]

const expandedText: Promise<string>[] = [
  client.getBlockHeader('value'),
  client.getBlockTransactionId('value', 0),
  client.getTransactionMerkleblockProof('value')
]

const expandedBinary: Promise<ArrayBuffer>[] = [
  client.getBlockRaw('value'),
  client.getTransactionRaw('value')
]

const historicalOptions: MempoolHistoricalPriceOptions = { currency: undefined, timestamp: undefined }
client.getHistoricalPrice(historicalOptions)
client.getHistoricalPrice()
client.getAddressTransactionsChain('address')
client.getMiningPoolBlocks('pool', undefined)
client.getBlocksBulk(0, undefined)
client.getBlocks(undefined)
client.getBlocksV1()
client.getMiningPools()
client.getMiningPoolHashrates()
client.getHashrate()
client.getDifficultyAdjustments()
client.getBlocksAuditScores()
const confirmedPage: Transaction[] = await client.getAddressTransactionsChain<Transaction>('address')
const arrivalTimes: number[] = await client.getTransactionTimes<number>(['txid'])
const prices: { prices: unknown[] } = await client.getHistoricalPrice<{ prices: unknown[] }>()

// @ts-expect-error Raw block bytes are ArrayBuffer, not text.
const rawBlockText: Promise<string> = client.getBlockRaw('hash')
// @ts-expect-error Raw transaction bytes are ArrayBuffer, not text.
const rawTransactionText: Promise<string> = client.getTransactionRaw('txid')
// @ts-expect-error Transaction times require an array of string IDs.
client.getTransactionTimes('txid')
// @ts-expect-error Transaction IDs must be strings.
client.getTransactionTimes([123])
// @ts-expect-error Historical timestamps must be numeric.
client.getHistoricalPrice({ timestamp: '0' })
// @ts-expect-error Currencies must be strings.
client.getHistoricalPrice({ currency: 123 })
// @ts-expect-error Mining periods are strings.
client.getMiningPools(1)
// @ts-expect-error Optional block heights must be numbers.
client.getBlocks('0')
// @ts-expect-error Block counts are required.
client.getRewardStats()
// @ts-expect-error Block transaction indices must be numbers.
client.getBlockTransactionId('hash', '0')
