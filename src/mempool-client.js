import { createBaseUrl, createHeaders, encodeSegment, requireInteger, requireOptions, requireString, requireStringArray, optionalStringSegment, optionalIntegerSegment } from './options.js'
import { MempoolApiError } from './errors.js'

/** A thin Mempool HTTP(S) client using native fetch. Connection settings are immutable. */
export class MempoolClient {
  #url
  #timeout
  #headers

  /**
   * @param {object} options Connection settings
   * @param {string} options.url HTTP(S) API URL, including any path prefix
   * @param {number} [options.timeout=10000] Timeout in milliseconds, including response body reading
   * @param {Record<string, string>} [options.headers] Additional HTTP headers
   */
  constructor(options = {}) {
    requireOptions(options)
    const { url, timeout = 10000, headers } = options
    this.#url = createBaseUrl(url)

    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 2147483647) {
      throw new TypeError('timeout must be an integer between 1 and 2147483647')
    }

    this.#timeout = timeout
    this.#headers = createHeaders(headers)
  }

  /**
   * Difficulty adjustment details.
   * @returns {Promise<unknown>} Difficulty adjustment details
   */
  async getDifficultyAdjustment() {
    return this.#request('/v1/difficulty-adjustment')
  }

  /**
   * Latest prices in the server's currencies.
   * @returns {Promise<unknown>} Latest prices in the server's currencies
   */
  async getPrices() {
    return this.#request('/v1/prices')
  }

  /**
   * Historical prices with optional currency and timestamp filters.
   * @param {object} [options] Forwarded to the server
   * @param {string} [options.currency] Currency filter
   * @param {number} [options.timestamp] Non-negative Unix timestamp
   * @returns {Promise<unknown>} Historical prices with optional currency and timestamp filters
   */
  async getHistoricalPrice(options = {}) {
    requireOptions(options)
    const { currency, timestamp } = options
    return this.#request('/v1/historical-price', {
      query: [
        ['currency', currency === undefined ? undefined : requireString(currency, 'currency')],
        ['timestamp', timestamp === undefined ? undefined : requireInteger(timestamp, 'timestamp')]
      ]
    })
  }

  /**
   * @param {string} address Address to look up
   * @returns {Promise<unknown>} Address information
   */
  async getAddress(address) {
    return this.#request(`/address/${encodeSegment(address, 'address')}`)
  }

  /**
   * @param {string} address Address to look up
   * @param {string} [afterTxid] Cursor for mixed transaction history
   * @returns {Promise<unknown[]>} One page of transaction history
   */
  async getAddressTransactions(address, afterTxid) {
    return this.#request(`/address/${encodeSegment(address, 'address')}/txs`, {
      query: [['after_txid', afterTxid === undefined ? undefined : requireString(afterTxid, 'afterTxid')]]
    })
  }

  /**
   * @param {string} address Address to look up
   * @returns {Promise<unknown[]>} Unspent outputs
   */
  async getAddressUtxos(address) {
    return this.#request(`/address/${encodeSegment(address, 'address')}/utxo`)
  }

  /**
   * One page of confirmed address transactions.
   * @param {string} address Forwarded to the server
   * @param {string} [afterTxid] Forwarded to the server
   * @returns {Promise<unknown[]>} One page of confirmed address transactions
   */
  async getAddressTransactionsChain(address, afterTxid) {
    return this.#request(`/address/${encodeSegment(address, 'address')}/txs/chain${optionalStringSegment(afterTxid, 'afterTxid')}`)
  }

  /**
   * Unconfirmed address transactions.
   * @param {string} address Forwarded to the server
   * @returns {Promise<unknown[]>} Unconfirmed address transactions
   */
  async getAddressTransactionsMempool(address) {
    return this.#request(`/address/${encodeSegment(address, 'address')}/txs/mempool`)
  }

  /**
   * Server-side address validation.
   * @param {string} address Forwarded to the server
   * @returns {Promise<unknown>} Server-side address validation
   */
  async validateAddress(address) {
    return this.#request(`/v1/validate-address/${encodeSegment(address, 'address')}`)
  }

  /**
   * @param {string} hash Block hash
   * @returns {Promise<unknown>} Block information
   */
  async getBlock(hash) {
    return this.#request(`/block/${encodeSegment(hash, 'hash')}`)
  }

  /**
   * @param {string} hash Block hash
   * @returns {Promise<unknown>} Block chain status
   */
  async getBlockStatus(hash) {
    return this.#request(`/block/${encodeSegment(hash, 'hash')}/status`)
  }

  /**
   * @param {string} hash Block hash
   * @param {number} [startIndex] Non-negative starting index; standard servers require multiples of 25
   * @returns {Promise<unknown[]>} One page of block transactions
   */
  async getBlockTransactions(hash, startIndex) {
    const path = `/block/${encodeSegment(hash, 'hash')}/txs`
    return this.#request(startIndex === undefined ? path : `${path}/${requireInteger(startIndex, 'startIndex')}`)
  }

  /**
   * @param {number} height Non-negative block height
   * @returns {Promise<string>} Block hash
   */
  async getBlockHash(height) {
    return this.#request(`/block-height/${requireInteger(height, 'height')}`, { responseType: 'text' })
  }

  /** @returns {Promise<string>} Current chain tip height as unmodified response text */
  async getTipHeight() {
    return this.#request('/blocks/tip/height', { responseType: 'text' })
  }

  /** @returns {Promise<string>} Current chain tip hash */
  async getTipHash() {
    return this.#request('/blocks/tip/hash', { responseType: 'text' })
  }

  /**
   * Block details from the Mempool backend.
   * @param {string} hash Forwarded to the server
   * @returns {Promise<unknown>} Block details from the Mempool backend
   */
  async getBlockV1(hash) {
    return this.#request(`/v1/block/${encodeSegment(hash, 'hash')}`)
  }

  /**
   * Unmodified block header hex.
   * @param {string} hash Forwarded to the server
   * @returns {Promise<string>} Unmodified block header hex
   */
  async getBlockHeader(hash) {
    return this.#request(`/block/${encodeSegment(hash, 'hash')}/header`, { responseType: 'text' })
  }

  /**
   * Height and hash of the block closest to a timestamp.
   * @param {number} timestamp Non-negative safe integer
   * @returns {Promise<unknown>} Height and hash of the block closest to a timestamp
   */
  async getBlockTimestamp(timestamp) {
    return this.#request(`/v1/mining/blocks/timestamp/${requireInteger(timestamp, 'timestamp')}`)
  }

  /**
   * Unmodified raw block bytes.
   * @param {string} hash Forwarded to the server
   * @returns {Promise<ArrayBuffer>} Unmodified raw block bytes
   */
  async getBlockRaw(hash) {
    return this.#request(`/block/${encodeSegment(hash, 'hash')}/raw`, { responseType: 'binary' })
  }

  /**
   * Unmodified transaction ID at the specified block index.
   * @param {string} hash Forwarded to the server
   * @param {number} index Non-negative safe integer
   * @returns {Promise<string>} Unmodified transaction ID at the specified block index
   */
  async getBlockTransactionId(hash, index) {
    return this.#request(`/block/${encodeSegment(hash, 'hash')}/txid/${requireInteger(index, 'index')}`, { responseType: 'text' })
  }

  /**
   * All transaction IDs in a block.
   * @param {string} hash Forwarded to the server
   * @returns {Promise<unknown[]>} All transaction IDs in a block
   */
  async getBlockTransactionIds(hash) {
    return this.#request(`/block/${encodeSegment(hash, 'hash')}/txids`)
  }

  /**
   * One page of recent blocks.
   * @param {number} [startHeight] Non-negative safe integer
   * @returns {Promise<unknown[]>} One page of recent blocks
   */
  async getBlocks(startHeight) {
    return this.#request(`/blocks${optionalIntegerSegment(startHeight, 'startHeight')}`)
  }

  /**
   * One page of recent blocks from the Mempool backend.
   * @param {number} [startHeight] Non-negative safe integer
   * @returns {Promise<unknown[]>} One page of recent blocks from the Mempool backend
   */
  async getBlocksV1(startHeight) {
    return this.#request(`/v1/blocks${optionalIntegerSegment(startHeight, 'startHeight')}`)
  }

  /**
   * Blocks in the requested height range.
   * @param {number} minHeight Non-negative safe integer
   * @param {number} [maxHeight] Non-negative safe integer
   * @returns {Promise<unknown[]>} Blocks in the requested height range
   */
  async getBlocksBulk(minHeight, maxHeight) {
    return this.#request(`/v1/blocks-bulk/${requireInteger(minHeight, 'minHeight')}${optionalIntegerSegment(maxHeight, 'maxHeight')}`)
  }

  /**
   * Mining pool statistics.
   * @param {string} [timePeriod] Forwarded to the server
   * @returns {Promise<unknown>} Mining pool statistics
   */
  async getMiningPools(timePeriod) {
    return this.#request(`/v1/mining/pools${optionalStringSegment(timePeriod, 'timePeriod')}`)
  }

  /**
   * Details of a mining pool.
   * @param {string} slug Forwarded to the server
   * @returns {Promise<unknown>} Details of a mining pool
   */
  async getMiningPool(slug) {
    return this.#request(`/v1/mining/pool/${encodeSegment(slug, 'slug')}`)
  }

  /**
   * Historical hashrates of mining pools.
   * @param {string} [timePeriod] Forwarded to the server
   * @returns {Promise<unknown[]>} Historical hashrates of mining pools
   */
  async getMiningPoolHashrates(timePeriod) {
    return this.#request(`/v1/mining/hashrate/pools${optionalStringSegment(timePeriod, 'timePeriod')}`)
  }

  /**
   * Historical hashrate of a mining pool.
   * @param {string} slug Forwarded to the server
   * @returns {Promise<unknown[]>} Historical hashrate of a mining pool
   */
  async getMiningPoolHashrate(slug) {
    return this.#request(`/v1/mining/pool/${encodeSegment(slug, 'slug')}/hashrate`)
  }

  /**
   * One page of blocks mined by a pool.
   * @param {string} slug Forwarded to the server
   * @param {number} [blockHeight] Non-negative safe integer
   * @returns {Promise<unknown[]>} One page of blocks mined by a pool
   */
  async getMiningPoolBlocks(slug, blockHeight) {
    return this.#request(`/v1/mining/pool/${encodeSegment(slug, 'slug')}/blocks${optionalIntegerSegment(blockHeight, 'blockHeight')}`)
  }

  /**
   * Network hashrate and difficulty history.
   * @param {string} [timePeriod] Forwarded to the server
   * @returns {Promise<unknown>} Network hashrate and difficulty history
   */
  async getHashrate(timePeriod) {
    return this.#request(`/v1/mining/hashrate${optionalStringSegment(timePeriod, 'timePeriod')}`)
  }

  /**
   * Historical difficulty adjustments.
   * @param {string} [interval] Forwarded to the server
   * @returns {Promise<unknown[]>} Historical difficulty adjustments
   */
  async getDifficultyAdjustments(interval) {
    return this.#request(`/v1/mining/difficulty-adjustments${optionalStringSegment(interval, 'interval')}`)
  }

  /**
   * Reward and transaction statistics for a block count.
   * @param {number} blockCount Non-negative safe integer
   * @returns {Promise<unknown>} Reward and transaction statistics for a block count
   */
  async getRewardStats(blockCount) {
    return this.#request(`/v1/mining/reward-stats/${requireInteger(blockCount, 'blockCount')}`)
  }

  /**
   * Historical block fees.
   * @param {string} timePeriod Forwarded to the server
   * @returns {Promise<unknown[]>} Historical block fees
   */
  async getBlockFees(timePeriod) {
    return this.#request(`/v1/mining/blocks/fees/${encodeSegment(timePeriod, 'timePeriod')}`)
  }

  /**
   * Historical block rewards.
   * @param {string} timePeriod Forwarded to the server
   * @returns {Promise<unknown[]>} Historical block rewards
   */
  async getBlockRewards(timePeriod) {
    return this.#request(`/v1/mining/blocks/rewards/${encodeSegment(timePeriod, 'timePeriod')}`)
  }

  /**
   * Historical block fee rates.
   * @param {string} timePeriod Forwarded to the server
   * @returns {Promise<unknown[]>} Historical block fee rates
   */
  async getBlockFeeRates(timePeriod) {
    return this.#request(`/v1/mining/blocks/fee-rates/${encodeSegment(timePeriod, 'timePeriod')}`)
  }

  /**
   * Historical block fee rates with up to three decimal places.
   * @param {string} timePeriod Forwarded to the server
   * @returns {Promise<unknown[]>} Historical block fee rates with up to three decimal places
   */
  async getBlockFeeRatesPrecise(timePeriod) {
    return this.#request(`/v1/mining/blocks/fee-rates/${encodeSegment(timePeriod, 'timePeriod')}/precise`)
  }

  /**
   * Historical block sizes and weights.
   * @param {string} timePeriod Forwarded to the server
   * @returns {Promise<unknown>} Historical block sizes and weights
   */
  async getBlockSizesWeights(timePeriod) {
    return this.#request(`/v1/mining/blocks/sizes-weights/${encodeSegment(timePeriod, 'timePeriod')}`)
  }

  /**
   * Historical block prediction statistics.
   * @param {string} timePeriod Forwarded to the server
   * @returns {Promise<unknown[]>} Historical block prediction statistics
   */
  async getBlockPredictions(timePeriod) {
    return this.#request(`/v1/mining/blocks/predictions/${encodeSegment(timePeriod, 'timePeriod')}`)
  }

  /**
   * Audit score of a block.
   * @param {string} hash Forwarded to the server
   * @returns {Promise<unknown>} Audit score of a block
   */
  async getBlockAuditScore(hash) {
    return this.#request(`/v1/mining/blocks/audit/score/${encodeSegment(hash, 'hash')}`)
  }

  /**
   * One page of block audit scores.
   * @param {number} [startHeight] Non-negative safe integer
   * @returns {Promise<unknown[]>} One page of block audit scores
   */
  async getBlocksAuditScores(startHeight) {
    return this.#request(`/v1/mining/blocks/audit/scores${optionalIntegerSegment(startHeight, 'startHeight')}`)
  }

  /**
   * Audit summary of a block.
   * @param {string} hash Forwarded to the server
   * @returns {Promise<unknown>} Audit summary of a block
   */
  async getBlockAuditSummary(hash) {
    return this.#request(`/v1/block/${encodeSegment(hash, 'hash')}/audit-summary`)
  }

  /**
   * Projected mempool block fee statistics.
   * @returns {Promise<unknown[]>} Projected mempool block fee statistics
   */
  async getMempoolBlocksFees() {
    return this.#request('/v1/fees/mempool-blocks')
  }

  /**
   * Recommended transaction fees.
   * @returns {Promise<unknown>} Recommended transaction fees
   */
  async getRecommendedFees() {
    return this.#request('/v1/fees/recommended')
  }

  /**
   * Recommended fees at the server's full precision.
   * @returns {Promise<unknown>} Recommended fees at the server's full precision
   */
  async getRecommendedFeesPrecise() {
    return this.#request('/v1/fees/precise')
  }

  /**
   * Mempool backlog statistics.
   * @returns {Promise<unknown>} Mempool backlog statistics
   */
  async getMempool() {
    return this.#request('/mempool')
  }

  /**
   * Mempool transaction IDs.
   * @returns {Promise<unknown[]>} Mempool transaction IDs
   */
  async getMempoolTransactionIds() {
    return this.#request('/mempool/txids')
  }

  /**
   * Recent mempool transactions.
   * @returns {Promise<unknown[]>} Recent mempool transactions
   */
  async getMempoolRecent() {
    return this.#request('/mempool/recent')
  }

  /**
   * Mempool RBF replacement chains.
   * @returns {Promise<unknown[]>} Mempool RBF replacement chains
   */
  async getMempoolRbfTransactions() {
    return this.#request('/v1/replacements')
  }

  /**
   * Mempool Full-RBF replacement chains.
   * @returns {Promise<unknown[]>} Mempool Full-RBF replacement chains
   */
  async getMempoolFullRbfTransactions() {
    return this.#request('/v1/fullrbf/replacements')
  }

  /**
   * @param {string} txid Transaction ID
   * @returns {Promise<unknown>} Transaction information
   */
  async getTransaction(txid) {
    return this.#request(`/tx/${encodeSegment(txid, 'txid')}`)
  }

  /**
   * @param {string} txid Transaction ID
   * @returns {Promise<unknown>} Confirmation status
   */
  async getTransactionStatus(txid) {
    return this.#request(`/tx/${encodeSegment(txid, 'txid')}/status`)
  }

  /**
   * @param {string} txid Transaction ID
   * @returns {Promise<string>} Raw transaction hex
   */
  async getTransactionHex(txid) {
    return this.#request(`/tx/${encodeSegment(txid, 'txid')}/hex`, { responseType: 'text' })
  }

  /**
   * @param {string} txid Transaction ID
   * @returns {Promise<unknown[]>} Spending status of all outputs
   */
  async getTransactionOutspends(txid) {
    return this.#request(`/tx/${encodeSegment(txid, 'txid')}/outspends`)
  }

  /**
   * @param {string} txid Transaction ID
   * @param {number} vout Non-negative output index
   * @returns {Promise<unknown>} Spending status of the output
   */
  async getTransactionOutspend(txid, vout) {
    return this.#request(`/tx/${encodeSegment(txid, 'txid')}/outspend/${requireInteger(vout, 'vout')}`)
  }

  /**
   * @param {string} hex Raw transaction hex, forwarded unchanged
   * @returns {Promise<string>} Transaction ID
   */
  async broadcastTransaction(hex) {
    requireString(hex, 'hex')
    return this.#request('/tx', {
      method: 'POST',
      body: hex,
      headers: { 'Content-Type': 'text/plain' },
      responseType: 'text'
    })
  }

  /**
   * Server-calculated ancestor and descendant fee information.
   * @param {string} txid Forwarded to the server
   * @returns {Promise<unknown>} Server-calculated ancestor and descendant fee information
   */
  async getTransactionCpfp(txid) {
    return this.#request(`/v1/cpfp/${encodeSegment(txid, 'txid')}`)
  }

  /**
   * Unmodified merkleblock proof hex.
   * @param {string} txid Forwarded to the server
   * @returns {Promise<string>} Unmodified merkleblock proof hex
   */
  async getTransactionMerkleblockProof(txid) {
    return this.#request(`/tx/${encodeSegment(txid, 'txid')}/merkleblock-proof`, { responseType: 'text' })
  }

  /**
   * Transaction merkle inclusion proof.
   * @param {string} txid Forwarded to the server
   * @returns {Promise<unknown>} Transaction merkle inclusion proof
   */
  async getTransactionMerkleProof(txid) {
    return this.#request(`/tx/${encodeSegment(txid, 'txid')}/merkle-proof`)
  }

  /**
   * Unmodified raw transaction bytes.
   * @param {string} txid Forwarded to the server
   * @returns {Promise<ArrayBuffer>} Unmodified raw transaction bytes
   */
  async getTransactionRaw(txid) {
    return this.#request(`/tx/${encodeSegment(txid, 'txid')}/raw`, { responseType: 'binary' })
  }

  /**
   * Transaction RBF timeline.
   * @param {string} txid Forwarded to the server
   * @returns {Promise<unknown>} Transaction RBF timeline
   */
  async getTransactionRbfTimeline(txid) {
    return this.#request(`/v1/tx/${encodeSegment(txid, 'txid')}/rbf`)
  }

  /**
   * Server-observed timestamps in transaction ID order.
   * @param {ReadonlyArray<string>} txids Forwarded to the server
   * @returns {Promise<unknown[]>} Server-observed timestamps in transaction ID order
   */
  async getTransactionTimes(txids) {
    requireStringArray(txids, 'txids')
    return this.#request('/v1/transaction-times', { query: txids.map((txid) => ['txId[]', txid]) })
  }

  async #request(path, { method = 'GET', body: requestBody, headers: requestHeaders = {}, responseType = 'json', query = [] } = {}) {
    const endpoint = new URL(path.replace(/^\/+/u, ''), this.#url)
    for (const [name, value] of query) {
      if (value !== undefined) endpoint.searchParams.append(name, String(value))
    }
    const url = endpoint.href
    const headers = new Headers(this.#headers)
    for (const [name, value] of Object.entries(requestHeaders)) headers.set(name, value)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), this.#timeout)
    timer.unref()
    let response
    let body
    const context = { method, url }

    try {
      try {
        response = await fetch(url, { method, headers, body: requestBody, signal: controller.signal, redirect: 'manual' })
        context.status = response.status
        context.statusText = response.statusText
        if (response.ok && responseType === 'binary') {
          body = await response.arrayBuffer()
        } else {
          body = await response.text()
          context.body = body
        }
      } catch (cause) {
        const message = controller.signal.aborted
          ? `Mempool ${method} ${url} timed out after ${this.#timeout}ms`
          : `Mempool ${method} ${url} request failed: ${cause?.message ?? String(cause)}`
        throw new MempoolApiError(message, { ...context, cause })
      }

      if (!response.ok) {
        throw new MempoolApiError(`Mempool ${method} ${url} failed with HTTP ${response.status} ${response.statusText}`.trim(), context)
      }

      if (responseType === 'text' || responseType === 'binary') return body

      try {
        return JSON.parse(body)
      } catch (cause) {
        throw new MempoolApiError(`Mempool ${method} ${url} returned invalid JSON`, { ...context, cause })
      }
    } finally {
      clearTimeout(timer)
    }
  }
}
