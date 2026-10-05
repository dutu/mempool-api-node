# TypeScript

TypeScript declarations are included in the package. Connection options,
method arguments, text/binary results and API error context are typed.

JSON results default to `unknown` because the library does not validate server
schemas. Supply an expected result type when you know the server's response:

```ts
import { MempoolClient, MempoolApiError } from 'mempool-api-node'
import type { MempoolClientOptions, MempoolHistoricalPriceOptions } from 'mempool-api-node'

const options: MempoolClientOptions = { url: 'http://127.0.0.1:3002' }
const client = new MempoolClient(options)

interface Transaction {
  txid: string
  status: { confirmed: boolean }
}

const transaction = await client.getTransaction<Transaction>('your-transaction-id')
const page = await client.getAddressTransactions<Transaction>('your-bitcoin-address')
const height: string = await client.getTipHeight()
const hex: string = await client.getTransactionHex(transaction.txid)

const filters: MempoolHistoricalPriceOptions = { currency: 'EUR', timestamp: 1500000000 }
const prices = await client.getHistoricalPrice<{ prices: unknown[] }>(filters)
const raw: ArrayBuffer = await client.getTransactionRaw(transaction.txid)

console.log(transaction.status.confirmed, page, height, hex, prices, new Uint8Array(raw))

try {
  await client.getBlockHash(800000)
} catch (error) {
  if (error instanceof MempoolApiError) {
    console.error(error.status, error.body, error.cause)
  } else {
    throw error
  }
}
```

For array-returning methods, the generic parameter is the **item** type; the
return type is `Promise<Item[]>`. For JSON object methods, it describes the
whole response. For example:

```ts
const fees = await client.getRecommendedFeesPrecise<Record<string, number>>()
```

These types do not add runtime checks. Responses, including extra server fields,
are passed through unchanged. All text responses, including tip height, are
`Promise<string>`. Raw block and transaction responses are `Promise<ArrayBuffer>`.
Callers handle any numeric conversion or binary decoding they need.

`MempoolClientOptions`, `MempoolHistoricalPriceOptions` and
`MempoolApiErrorOptions` are type-only exports.
Error context fields are optional because transport failures can occur before
receiving an HTTP response. `cause` retains the underlying failure as `unknown`.

See the [README](../README.md) for settings and the complete API.
