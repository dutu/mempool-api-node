# HTTPS and private certificate authorities

The client uses Node's native `fetch` for HTTP and HTTPS. HTTPS certificates are
verified using Node's trust configuration; no separate client transport setting
is needed:

```js
import { MempoolClient } from 'mempool-api-node'

const client = new MempoolClient({
  url: 'https://bitcoin.example.com/api'
})

console.log(await client.getTipHeight())
```

For a server using a private certificate authority, start Node with its trusted
CA certificate in PEM format:

```sh
NODE_EXTRA_CA_CERTS=/path/to/private-ca.pem node app.js
```

Set this environment variable before starting the process; changing it after
Node starts does not update certificate trust. The server certificate must also
match the hostname in the configured URL.

Certificate and other TLS failures are wrapped in `MempoolApiError`, with the
original fetch error preserved as `cause`. The underlying Node failure can be
available as `error.cause.cause`.

The package has no custom dispatcher, proxy or mutual TLS options. Its public
configuration is `url`, `timeout` and `headers`.

See [Node's certificate configuration documentation](https://nodejs.org/api/cli.html#node_extra_ca_certsfile)
and the [README](../README.md).
