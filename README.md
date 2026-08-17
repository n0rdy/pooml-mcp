# @pooml/mcp

MCP server for [pooml](https://github.com/n0rdy/pooml): query your logs and
metrics with plain SQL from Claude, or any other MCP client.

Runs on your machine (stdio), talks to your pooml instance over its
read-only [query API](https://github.com/n0rdy/pooml#query-api-sql-over-http).
Your credentials stay local; the pooml server needs nothing MCP-specific.

## Tools

- `query_logs` - SQL over the logs (levels, services, full-text search via FTS5)
- `query_metrics` - SQL over the metrics (counters and gauges)
- `list_metrics` - what metrics exist, so the model doesn't guess names

Strictly read-only: every query goes through pooml's layered SQL validation
(SELECT-only, allow-listed tables, read-only connection, timeouts, row caps).

## Setup

1. On the pooml server, enable the query API:
   `POOML_QUERY_API_ENABLED=true` and `POOML_QUERY_API_AUTH_SECRET=<min 32 chars>`.
2. Add to your MCP client. For Claude Code:

```bash
claude mcp add pooml \
  -e POOML_URL=https://your-pooml-host:8080 \
  -e POOML_QUERY_API_AUTH_SECRET=your-query-secret \
  -- npx -y @pooml/mcp
```

Or in `.mcp.json`:

```json
{
  "mcpServers": {
    "pooml": {
      "command": "npx",
      "args": ["-y", "@pooml/mcp"],
      "env": {
        "POOML_URL": "https://your-pooml-host:8080",
        "POOML_QUERY_API_AUTH_SECRET": "your-query-secret"
      }
    }
  }
}
```

If pooml sits behind a Cloudflare Tunnel with Access, add the service token:
`POOML_CF_ACCESS_CLIENT_ID` and `POOML_CF_ACCESS_CLIENT_SECRET`.

## Why SQL

pooml's whole pitch is that your observability data is SQLite queried with
SQL - and LLMs already speak SQL fluently. No custom query language for the
model to hallucinate around: it writes `SELECT service, COUNT(*) FROM logs
WHERE level >= 4 ...` and gets answers.

## License

[Apache-2.0](./LICENSE)
