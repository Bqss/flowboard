/**
 * Flowboard MCP server — remote, Streamable HTTP transport.
 *
 * Direct DB/domain access: imports Flowboard services (`@services/*`) and
 * resolves API keys + scope directly from the database. No REST proxy.
 *
 * Run: `bun run server.ts` (or `bun run dev`).
 *
 * Client setup:
 *   - Endpoint:   http://<host>:<MCP_PORT>/mcp
 *   - Headers:
 *       Authorization: Bearer <MCP_API_KEY>
 *
 *   The API key is generated per-workspace in Flowboard settings.
 *   The workspace + scope + enabled tools are resolved from the key.
 *
 * Env:
 *   MCP_PORT                    (default 3100)
 *   DATABASE_URL                (postgres connection string — same as Flowboard app)
 *   INTEGRATION_TOKEN_PEPPER    (same secret as Flowboard app, for key hashing)
 */
import {
  McpServer,
  WebStandardStreamableHTTPServerTransport
} from '@modelcontextprotocol/server';
import * as z from 'zod';
import { resolveApiKey, type ResolvedApiKey } from '@services/api-keys';
import { callMcpTool } from '@services/integration';
import { getToolDefinition, type McpToolName } from '@services/integration-tools';

const PORT = Number(process.env.MCP_PORT ?? 3100);

/**
 * Build a permissive zod schema that still advertises each tool argument to
 * MCP clients. Flowboard's dispatcher performs the authoritative validation.
 */
const toolInputSchema = (toolName: McpToolName) => {
  const definition = getToolDefinition(toolName);
  const shape = Object.fromEntries(
    Object.keys(definition?.inputSchema.properties ?? {}).map((name) => [
      name,
      definition?.inputSchema.required.includes(name) ? z.any() : z.any().optional()
    ])
  );
  return z.object(shape).passthrough();
};

/**
 * Build a per-request MCP server that only registers the tools enabled on
 * the resolved API key. Each tool call goes directly through Flowboard's
 * domain services (callMcpTool) — no REST hop.
 */
const buildServer = (auth: ResolvedApiKey) => {
  const server = new McpServer({ name: 'flowboard', version: '1.0.0' });

  for (const toolName of auth.enabledTools) {
    const def = getToolDefinition(toolName as McpToolName);
    if (!def) continue;

    server.registerTool(
      def.name,
      { description: def.description, inputSchema: toolInputSchema(def.name) },
      async (args) => {
        try {
          const result = await callMcpTool(auth, def.name, args as Record<string, unknown>);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Tool call failed';
          return {
            content: [{ type: 'text' as const, text: `Error: ${message}` }],
            isError: true
          };
        }
      }
    );
  }

  return server;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });

const server = Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/mcp') {
      return json(404, { error: 'Not found. Use POST /mcp.' });
    }

    // Health check shortcut for plain GET (no SSE accept header).
    if (request.method === 'GET' && !request.headers.get('accept')?.includes('text/event-stream')) {
      return json(200, { ok: true, service: 'flowboard-mcp', version: '1.0.0' });
    }

    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!apiKey) {
      return json(401, { error: 'Unauthorized: missing Bearer token.' });
    }

    const auth = await resolveApiKey(apiKey);
    if (!auth) {
      return json(401, { error: 'Unauthorized: invalid or revoked API key.' });
    }

    // Stateless mode: fresh transport + server per request. JSON responses
    // (not SSE) so each request returns a complete answer inline.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    const mcpServer = buildServer(auth);
    await mcpServer.connect(transport);

    try {
      return await transport.handleRequest(request);
    } finally {
      await mcpServer.close();
    }
  }
});

console.log(`Flowboard MCP server listening on http://0.0.0.0:${PORT}/mcp`);
console.log(`Mode: direct DB access (Flowboard services)`);
console.log(`Client headers:`);
console.log(`  Authorization: Bearer <MCP_API_KEY>`);

export { server };
// deploy test 1787967017
