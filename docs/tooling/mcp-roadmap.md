# MCP Roadmap

## Required now

- Context7 is declared in `.codex/config.toml` and is required for every team member.
- Authentication remains local to each developer. Credentials, tokens, and user-specific configuration must not be committed.

## Deferred integrations

The following integrations are expected later, but bootstrap intentionally introduces no endpoints, credentials, permissions, or workflow decisions for them:

- Figma
- GitHub
- Firebase
- Notion
- Ollama

Each integration requires a separate review covering purpose, source, permissions, team setup, secret handling, and whether configuration belongs in the repository or the developer's local environment.
