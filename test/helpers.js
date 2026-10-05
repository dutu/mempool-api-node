import { once } from 'node:events'
import { createServer } from 'node:http'

export const mockApi = async function mockApi(context, reply) {
  const calls = []
  const server = createServer(async (request, response) => {
    try {
      let body = ''
      request.setEncoding('utf8')
      for await (const chunk of request) body += chunk
      calls.push({ path: request.url, method: request.method, headers: request.headers, body })
      if (reply) {
        await reply(request, response, calls.at(-1))
      } else {
        response.setHeader('Content-Type', 'application/json')
        response.end('{"ok":true}')
      }
    } catch (error) {
      response.destroy(error)
    }
  })
  context.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return { server, calls, url: `http://127.0.0.1:${server.address().port}` }
}
