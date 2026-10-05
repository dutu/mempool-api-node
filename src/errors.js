/** An HTTP, transport or response failure from the Mempool API. */
export class MempoolApiError extends Error {
  /**
   * @param {string} message Description of the failure
   * @param {object} [options] Available request and response context
   * @param {number} [options.status] HTTP status
   * @param {string} [options.statusText] HTTP status text
   * @param {string} [options.method] HTTP request method
   * @param {string} [options.url] Request URL
   * @param {string} [options.body] Unparsed response body
   * @param {unknown} [options.cause] Original failure
   */
  constructor(message, options = {}) {
    super(message, options)
    this.name = new.target.name

    for (const key of ['status', 'statusText', 'method', 'url', 'body']) {
      if (options[key] !== undefined) this[key] = options[key]
    }
  }
}
