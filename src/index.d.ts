export interface MempoolClientOptions {
  /** HTTP(S) API URL, including any path prefix. */
  url: string
  /** Integer between 1 and 2147483647; defaults to 10000 milliseconds. */
  timeout?: number | undefined
  /** Additional headers. Header names are case-insensitive. */
  headers?: Record<string, string> | undefined
}

export interface MempoolApiErrorOptions extends ErrorOptions {
  status?: number | undefined
  statusText?: string | undefined
  method?: string | undefined
  url?: string | undefined
  body?: string | undefined
}

export interface MempoolHistoricalPriceOptions {
  currency?: string | undefined
  timestamp?: number | undefined
}

/** A thin Mempool HTTP(S) client. Connection settings are immutable. */
export class MempoolClient {
  constructor(options: MempoolClientOptions)
  getDifficultyAdjustment<Result = unknown>(): Promise<Result>
  getPrices<Result = unknown>(): Promise<Result>
  getHistoricalPrice<Result = unknown>(options?: MempoolHistoricalPriceOptions | undefined): Promise<Result>

  getAddress<Result = unknown>(address: string): Promise<Result>
  getAddressTransactions<Transaction = unknown>(address: string, afterTxid?: string | undefined): Promise<Transaction[]>
  getAddressUtxos<Utxo = unknown>(address: string): Promise<Utxo[]>
  getAddressTransactionsChain<Item = unknown>(address: string, afterTxid?: string | undefined): Promise<Item[]>
  getAddressTransactionsMempool<Item = unknown>(address: string): Promise<Item[]>
  validateAddress<Result = unknown>(address: string): Promise<Result>

  getBlock<Result = unknown>(hash: string): Promise<Result>
  getBlockStatus<Result = unknown>(hash: string): Promise<Result>
  getBlockTransactions<Transaction = unknown>(hash: string, startIndex?: number | undefined): Promise<Transaction[]>
  getBlockHash(height: number): Promise<string>
  getTipHeight(): Promise<string>
  getTipHash(): Promise<string>
  getBlockV1<Result = unknown>(hash: string): Promise<Result>
  getBlockHeader(hash: string): Promise<string>
  getBlockTimestamp<Result = unknown>(timestamp: number): Promise<Result>
  getBlockRaw(hash: string): Promise<ArrayBuffer>
  getBlockTransactionId(hash: string, index: number): Promise<string>
  getBlockTransactionIds<Item = unknown>(hash: string): Promise<Item[]>
  getBlocks<Item = unknown>(startHeight?: number | undefined): Promise<Item[]>
  getBlocksV1<Item = unknown>(startHeight?: number | undefined): Promise<Item[]>
  getBlocksBulk<Item = unknown>(minHeight: number, maxHeight?: number | undefined): Promise<Item[]>

  getMiningPools<Result = unknown>(timePeriod?: string | undefined): Promise<Result>
  getMiningPool<Result = unknown>(slug: string): Promise<Result>
  getMiningPoolHashrates<Item = unknown>(timePeriod?: string | undefined): Promise<Item[]>
  getMiningPoolHashrate<Item = unknown>(slug: string): Promise<Item[]>
  getMiningPoolBlocks<Item = unknown>(slug: string, blockHeight?: number | undefined): Promise<Item[]>
  getHashrate<Result = unknown>(timePeriod?: string | undefined): Promise<Result>
  getDifficultyAdjustments<Item = unknown>(interval?: string | undefined): Promise<Item[]>
  getRewardStats<Result = unknown>(blockCount: number): Promise<Result>
  getBlockFees<Item = unknown>(timePeriod: string): Promise<Item[]>
  getBlockRewards<Item = unknown>(timePeriod: string): Promise<Item[]>
  getBlockFeeRates<Item = unknown>(timePeriod: string): Promise<Item[]>
  getBlockSizesWeights<Result = unknown>(timePeriod: string): Promise<Result>
  getBlockPredictions<Item = unknown>(timePeriod: string): Promise<Item[]>
  getBlockAuditScore<Result = unknown>(hash: string): Promise<Result>
  getBlocksAuditScores<Item = unknown>(startHeight?: number | undefined): Promise<Item[]>
  getBlockAuditSummary<Result = unknown>(hash: string): Promise<Result>

  getMempoolBlocksFees<Item = unknown>(): Promise<Item[]>
  getRecommendedFees<Result = unknown>(): Promise<Result>
  getRecommendedFeesPrecise<Result = unknown>(): Promise<Result>

  getMempool<Result = unknown>(): Promise<Result>
  getMempoolTransactionIds<Item = unknown>(): Promise<Item[]>
  getMempoolRecent<Item = unknown>(): Promise<Item[]>
  getMempoolRbfTransactions<Item = unknown>(): Promise<Item[]>
  getMempoolFullRbfTransactions<Item = unknown>(): Promise<Item[]>

  getTransaction<Result = unknown>(txid: string): Promise<Result>
  getTransactionStatus<Result = unknown>(txid: string): Promise<Result>
  getTransactionHex(txid: string): Promise<string>
  getTransactionOutspends<Outspend = unknown>(txid: string): Promise<Outspend[]>
  getTransactionOutspend<Result = unknown>(txid: string, vout: number): Promise<Result>
  broadcastTransaction(hex: string): Promise<string>
  getTransactionCpfp<Result = unknown>(txid: string): Promise<Result>
  getTransactionMerkleblockProof(txid: string): Promise<string>
  getTransactionMerkleProof<Result = unknown>(txid: string): Promise<Result>
  getTransactionRaw(txid: string): Promise<ArrayBuffer>
  getTransactionRbfTimeline<Result = unknown>(txid: string): Promise<Result>
  getTransactionTimes<Item = unknown>(txids: readonly string[]): Promise<Item[]>
}

/** An HTTP, transport or response failure with available request context. */
export class MempoolApiError extends Error {
  constructor(message: string, options?: MempoolApiErrorOptions)
  status?: number | undefined
  statusText?: string | undefined
  method?: string | undefined
  url?: string | undefined
  body?: string | undefined
}
