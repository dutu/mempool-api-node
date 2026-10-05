# Contributing

## Development and tests

This repository follows `wasabi-api-node` conventions: JavaScript ES modules,
Node.js >=22, two-space indentation, single quotes, and no semicolons.

It uses Yarn 4 with Plug'n'Play (PnP) and a project-local cache for zero-installs:

```sh
yarn install --immutable
yarn test
```

`yarn test` runs `test/*.test.js` with Node's built-in test runner, then strict
TypeScript consumer checks under both NodeNext and bundler module resolution.
To run just declaration checks:

```sh
yarn test:types
```

Runtime tests use local HTTP/HTTPS servers and fetch mocks. They never contact
public Mempool servers. HTTPS tests launch native Node child processes with a
test-only certificate supplied through `NODE_EXTRA_CA_CERTS`; certificate
verification remains enabled. The certificate/key fixtures are only for local
tests, with localhost/127.0.0.1 subject alternative names and validity through 2036.

Yarn enables its PnP loaders automatically. To run the runtime tests directly
after a Yarn install:

```sh
node --require ./.pnp.cjs --loader ./.pnp.loader.mjs --test "test/*.test.js"
```

Use the explicit glob so the runner does not execute compile-only fixtures in
`test/types/`. Runtime code has no dependencies, so `node --test
"test/*.test.js"` also works without PnP loaders. Running `npm test` requires a
conventional development dependency install for the TypeScript checks.

CI runs the same immutable install and test command on Node 22 and 24.
Check the publication allowlist with:

```sh
npm pack --dry-run
```

## Architecture

The package-root barrel exports the client and its API error. The client owns
immutable connection settings and one private request method shared by every
endpoint. Public methods validate arguments, build an endpoint path and select
a response type. The transport joins paths under the configured prefix, merges
headers, applies a per-request abort timeout, reads the response, checks HTTP
status and parses JSON or returns text/binary data unchanged. Binary endpoints
use native `ArrayBuffer` responses; HTTP error bodies remain text. Query values
are encoded through `URLSearchParams`. The abort timeout covers every body reader.

Validation helpers live separately from the client; the exported error class
preserves available request/response context and the original cause. TypeScript
declarations sit beside the JavaScript and are checked through package-root
consumer imports. Generic JSON types describe caller expectations; no response
schema validation happens at runtime.

Keep new endpoint wrappers small. Pagination, retries, Bitcoin analysis,
caching, wallet abstractions and persistence belong in the consuming application.
Requests run independently; there is no RPC queue or owned transport pool to close.

## Git workflow

Leave changes uncommitted for manual review. Do not stage, commit or push unless
explicitly requested by the maintainer.
