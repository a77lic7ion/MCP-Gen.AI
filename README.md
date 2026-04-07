# MCP Config Generator

A local-first tool to generate Model Context Protocol (MCP) configurations for various IDEs and servers.

## Features

- **IDE Support**: VS Code, AnythingLLM, TRAE, Antigravity, OpenCode.
- **Server Catalog**: Filesystem, Web Search, Git, Databases, Browser, Memory, AI, DevOps, Terminal, Comms, Network, Data.
- **Features**:
  - **Expand/Collapse All**: Quickly manage the visibility of all MCP server categories.
  - **Theme Support**: Toggle between Dark and Light modes.
  - **Saved Configs**: Save and manage multiple MCP configurations locally.
  - **Export/Import**: Backup your configurations as JSON files.
- **Settings**:
  - Tavily Search integration for finding MCP configs.
  - Config Validation Endpoint: Validate your generated JSON against LLMs (Gemini, Mistral, Anthropic, OpenRouter).
- **Styling**: Cyber/Tech aesthetic with IBM Plex fonts and dark mode.

## Setup

1. Select your target IDE.
2. Choose the MCP servers you want to include.
3. Fill in any required parameters (API keys, paths).
4. Click **Generate MCP Config**.
5. Copy the generated JSON to your IDE's configuration file.

## Validation

You can validate your config by providing an API key for one of the supported LLM providers in the Settings section.
