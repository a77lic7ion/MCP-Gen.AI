import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Search, ShieldCheck, ChevronRight, Copy, Check, Zap, Loader2, Globe, Folder, GitBranch, Database, MousePointer2, Brain, Bot, Cloud, Terminal, MessageSquare, Network, BarChart3, Sun, Moon, Save, Download, Plus, Upload, FolderOpen, RefreshCw, Trash2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---
interface InputDef {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'password';
  token: string;
}

interface ServerDef {
  id: string;
  title: string;
  pkg: string;
  cmd: string;
  args: string[];
  desc: string;
  badges: ('local' | 'key' | 'docker')[];
  inputs: InputDef[];
  env?: Record<string, string>;
  version?: string;
}

interface Category {
  id: string;
  icon: any;
  name: string;
  servers: ServerDef[];
}

interface IDE {
  id: string;
  label: string;
  filename: string;
  format: 'vscode' | 'anythingllm' | 'standard' | 'opencode';
  note: string;
}

// --- Constants ---
const IDE_DEFS: Record<string, IDE> = {
  vscode: {
    id: 'vscode',
    label: 'VS Code',
    filename: '.vscode/mcp.json',
    format: 'vscode',
    note: 'Save as <code>.vscode/mcp.json</code> in your project root. Requires VS Code 1.99+ or the MCP extension. Restart VS Code to activate.'
  },
  anythingllm: {
    id: 'anythingllm',
    label: 'AnythingLLM',
    filename: 'Agent MCP Config',
    format: 'anythingllm',
    note: 'Go to <strong>Settings &rarr; Agent Configuration &rarr; MCP Servers</strong>. Paste the config or import via the MCP panel. Restart agent to reload.'
  },
  trae: {
    id: 'trae',
    label: 'TRAE',
    filename: 'mcp_settings.json',
    format: 'standard',
    note: 'Open <strong>Settings &rarr; MCP &rarr; Edit Config</strong>. Paste this JSON and save. Restart TRAE to load the servers.'
  },
  antigravity: {
    id: 'antigravity',
    label: 'Antigravity',
    filename: 'mcp-config.json',
    format: 'standard',
    note: 'Place as <code>mcp-config.json</code> at project root, or set path in <strong>Settings &rarr; MCP Config Path</strong>. Reload workspace to activate.'
  },
  opencode: {
    id: 'opencode',
    label: 'OpenCode',
    filename: 'opencode.json',
    format: 'opencode',
    note: 'Merge the <code>"mcp"</code> block into your <code>opencode.json</code> at project root. Run <code>opencode reload</code> or restart the session.'
  },
  claudecode: {
    id: 'claudecode',
    label: 'Claude Code',
    filename: 'claude_desktop_config.json',
    format: 'standard',
    note: 'Claude Code uses the standard Claude Desktop configuration. Place this in <code>%APPDATA%\\Claude\\claude_desktop_config.json</code> (Windows) or <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS).'
  }
};

const CATALOGUE: Category[] = [
  {
    id: 'filesystem', icon: Folder, name: 'Filesystem',
    servers: [
      {
        id: 'fs-local', title: 'Filesystem', pkg: '@modelcontextprotocol/server-filesystem',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem@{{version}}', '{{path}}'],
        desc: 'Read/write local files scoped to a directory you specify.',
        badges: ['local'], version: '0.6.2',
        inputs: [{ id: 'path', label: 'Allowed Root Path', placeholder: '/home/user/projects', type: 'text', token: '{{path}}' }]
      },
      {
        id: 'fs-everything', title: 'Everything (test)', pkg: '@modelcontextprotocol/server-everything',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-everything@{{version}}'],
        desc: 'Full demo/test server: echo, file ops, sampling. Local only.',
        badges: ['local'], version: '0.6.2', inputs: []
      }
    ]
  },
  {
    id: 'websearch', icon: Globe, name: 'Web Search',
    servers: [
      {
        id: 'ws-tavily', title: 'Tavily Search', pkg: 'tavily-mcp',
        cmd: 'npx', args: ['-y', 'tavily-mcp@{{version}}'],
        desc: 'AI-optimised search via Tavily API. Best for research & summarisation.',
        badges: ['key'], version: '0.2.0',
        env: { TAVILY_API_KEY: '{{TAVILY_API_KEY}}' },
        inputs: [{ id: 'TAVILY_API_KEY', label: 'Tavily API Key', placeholder: 'tvly-…', type: 'password', token: '{{TAVILY_API_KEY}}' }]
      },
      {
        id: 'ws-brave', title: 'Brave Search', pkg: '@modelcontextprotocol/server-brave-search',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search@{{version}}'],
        desc: 'Privacy-first web + news search. Requires Brave Search API key.',
        badges: ['key'], version: '0.6.2',
        env: { BRAVE_API_KEY: '{{BRAVE_API_KEY}}' },
        inputs: [{ id: 'BRAVE_API_KEY', label: 'Brave API Key', placeholder: 'BSA…', type: 'password', token: '{{BRAVE_API_KEY}}' }]
      },
      {
        id: 'ws-exa', title: 'Exa Search', pkg: 'exa-mcp-server',
        cmd: 'npx', args: ['-y', 'exa-mcp-server@{{version}}'],
        desc: 'Semantic & keyword search. Great for technical docs and code.',
        badges: ['key'], version: '1.0.2',
        env: { EXA_API_KEY: '{{EXA_API_KEY}}' },
        inputs: [{ id: 'EXA_API_KEY', label: 'Exa API Key', placeholder: 'exa-…', type: 'password', token: '{{EXA_API_KEY}}' }]
      },
      {
        id: 'ws-ddg', title: 'DuckDuckGo', pkg: 'duckduckgo-mcp-server',
        cmd: 'npx', args: ['-y', 'duckduckgo-mcp-server@{{version}}'],
        desc: 'Free, no-key DuckDuckGo search. Zero API cost, privacy-respecting.',
        badges: ['local'], version: '1.0.0', inputs: []
      },
      {
        id: 'ws-fetch', title: 'Fetch / HTTP', pkg: '@modelcontextprotocol/server-fetch',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch@{{version}}'],
        desc: 'Fetch any URL and return clean text/HTML. No key needed.',
        badges: ['local'], version: '0.6.2', inputs: []
      },
      {
        id: 'ws-serper', title: 'Serper (Google)', pkg: 'serper-mcp-server',
        cmd: 'npx', args: ['-y', 'serper-mcp-server@{{version}}'],
        desc: 'Google search results via Serper.dev API.',
        badges: ['key'], version: '1.0.0',
        env: { SERPER_API_KEY: '{{SERPER_API_KEY}}' },
        inputs: [{ id: 'SERPER_API_KEY', label: 'Serper API Key', placeholder: '…', type: 'password', token: '{{SERPER_API_KEY}}' }]
      }
    ]
  },
  {
    id: 'anthropic', icon: Bot, name: 'Anthropic API',
    servers: [
      {
        id: 'ant-claude', title: 'Claude via Anthropic API', pkg: '@anthropic-ai/mcp-server-claude',
        cmd: 'npx', args: ['-y', '@anthropic-ai/mcp-server-claude@{{version}}'],
        desc: 'Use Claude models as tools via the official Anthropic API endpoint.',
        badges: ['key'], version: '0.1.0',
        env: { ANTHROPIC_API_KEY: '{{ANTHROPIC_API_KEY}}', ANTHROPIC_BASE_URL: 'https://api.anthropic.com', ANTHROPIC_MODEL: '{{ANTHROPIC_MODEL}}' },
        inputs: [
          { id: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', placeholder: 'sk-ant-api03-…', type: 'password', token: '{{ANTHROPIC_API_KEY}}' },
          { id: 'ANTHROPIC_MODEL', label: 'Model ID', placeholder: 'claude-3-5-sonnet-20241022', type: 'text', token: '{{ANTHROPIC_MODEL}}' },
          { id: 'ANTHROPIC_BASE_URL', label: 'Base URL', placeholder: 'https://api.anthropic.com', type: 'text', token: '{{ANTHROPIC_BASE_URL}}' }
        ]
      },
      {
        id: 'ant-bedrock', title: 'Claude via AWS Bedrock', pkg: '@anthropic-ai/mcp-server-bedrock',
        cmd: 'npx', args: ['-y', '@anthropic-ai/mcp-server-bedrock@{{version}}'],
        desc: 'Claude models via AWS Bedrock endpoint. Uses AWS credentials.',
        badges: ['key'], version: '0.1.0',
        env: { AWS_ACCESS_KEY_ID: '{{BED_KEY}}', AWS_SECRET_ACCESS_KEY: '{{BED_SECRET}}', AWS_REGION: '{{BED_REGION}}' },
        inputs: [
          { id: 'BED_KEY', label: 'AWS Access Key', placeholder: 'AKIA…', type: 'text', token: '{{BED_KEY}}' },
          { id: 'BED_SECRET', label: 'AWS Secret', placeholder: '', type: 'password', token: '{{BED_SECRET}}' },
          { id: 'BED_REGION', label: 'AWS Region', placeholder: 'us-east-1', type: 'text', token: '{{BED_REGION}}' }
        ]
      },
      {
        id: 'ant-vertex', title: 'Claude via Google Vertex AI', pkg: '@anthropic-ai/mcp-server-vertex',
        cmd: 'npx', args: ['-y', '@anthropic-ai/mcp-server-vertex@{{version}}'],
        desc: 'Claude models via Google Cloud Vertex AI endpoint. Uses GCP credentials.',
        badges: ['key'], version: '0.1.0',
        env: { GOOGLE_APPLICATION_CREDENTIALS: '{{GCP_CREDS}}', VERTEX_REGION: '{{VERTEX_REGION}}', VERTEX_PROJECT_ID: '{{VERTEX_PROJECT}}' },
        inputs: [
          { id: 'GCP_CREDS', label: 'GCP Credentials Path', placeholder: '/path/to/key.json', type: 'text', token: '{{GCP_CREDS}}' },
          { id: 'VERTEX_PROJECT', label: 'Project ID', placeholder: 'my-project-id', type: 'text', token: '{{VERTEX_PROJECT}}' },
          { id: 'VERTEX_REGION', label: 'Region', placeholder: 'us-central1', type: 'text', token: '{{VERTEX_REGION}}' }
        ]
      }
    ]
  },
  {
    id: 'git', icon: GitBranch, name: 'Git & GitHub',
    servers: [
      {
        id: 'git-github', title: 'GitHub', pkg: '@modelcontextprotocol/server-github',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-github@{{version}}'],
        desc: 'Repos, issues, PRs, commits, code search via GitHub API.',
        badges: ['key'], version: '0.6.2',
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: '{{GITHUB_PAT}}' },
        inputs: [{ id: 'GITHUB_PAT', label: 'GitHub PAT', placeholder: 'ghp_…', type: 'password', token: '{{GITHUB_PAT}}' }]
      },
      {
        id: 'git-local', title: 'Git (local repo)', pkg: '@cline/mcp-server-git',
        cmd: 'npx', args: ['-y', '@cline/mcp-server-git@{{version}}', '--repository', '{{git_path}}'],
        desc: 'Local git ops: log, diff, status, branches. No auth needed.',
        badges: ['local'], version: '1.0.0',
        inputs: [{ id: 'git_path', label: 'Repo Path', placeholder: '/home/user/myrepo', type: 'text', token: '{{git_path}}' }]
      },
      {
        id: 'git-gitlab', title: 'GitLab', pkg: '@modelcontextprotocol/server-gitlab',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-gitlab@{{version}}'],
        desc: 'GitLab projects, MRs, issues, pipelines.',
        badges: ['key'], version: '0.6.2',
        env: { GITLAB_PERSONAL_ACCESS_TOKEN: '{{GITLAB_PAT}}', GITLAB_API_URL: 'https://gitlab.com' },
        inputs: [{ id: 'GITLAB_PAT', label: 'GitLab PAT', placeholder: 'glpat-…', type: 'password', token: '{{GITLAB_PAT}}' }]
      },
      {
        id: 'git-bitbucket', title: 'Bitbucket', pkg: 'mcp-server-bitbucket',
        cmd: 'npx', args: ['-y', 'mcp-server-bitbucket@{{version}}'],
        desc: 'Bitbucket Cloud repositories, pull requests, and issues.',
        badges: ['key'], version: '1.0.0',
        env: { BITBUCKET_USERNAME: '{{BB_USER}}', BITBUCKET_APP_PASSWORD: '{{BB_PASS}}' },
        inputs: [
          { id: 'BB_USER', label: 'Username', placeholder: 'my-user', type: 'text', token: '{{BB_USER}}' },
          { id: 'BB_PASS', label: 'App Password', placeholder: '', type: 'password', token: '{{BB_PASS}}' }
        ]
      }
    ]
  },
  {
    id: 'database', icon: Database, name: 'Databases',
    servers: [
      {
        id: 'db-sqlite', title: 'SQLite', pkg: '@modelcontextprotocol/server-sqlite',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-sqlite@{{version}}', '--db-path', '{{sqlite_path}}'],
        desc: 'Query/write a local SQLite database. Fully offline.',
        badges: ['local'], version: '0.6.2',
        inputs: [{ id: 'sqlite_path', label: 'DB File Path', placeholder: '/home/user/data.db', type: 'text', token: '{{sqlite_path}}' }]
      },
      {
        id: 'db-postgres', title: 'PostgreSQL', pkg: '@modelcontextprotocol/server-postgres',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres@{{version}}', '{{pg_conn}}'],
        desc: 'Connect to local or remote Postgres.',
        badges: ['local'], version: '0.6.2',
        inputs: [{ id: 'pg_conn', label: 'Connection String', placeholder: 'postgresql://user:pass@localhost/dbname', type: 'text', token: '{{pg_conn}}' }]
      },
      {
        id: 'db-mysql', title: 'MySQL / MariaDB', pkg: 'mysql-mcp-server',
        cmd: 'npx', args: ['-y', 'mysql-mcp-server@{{version}}'],
        desc: 'MySQL/MariaDB queries via connection env vars.',
        badges: ['local'], version: '1.0.0',
        env: { MYSQL_HOST: '{{mysql_host}}', MYSQL_USER: '{{mysql_user}}', MYSQL_PASSWORD: '{{mysql_pass}}', MYSQL_DATABASE: '{{mysql_db}}' },
        inputs: [
          { id: 'mysql_host', label: 'Host', placeholder: 'localhost', type: 'text', token: '{{mysql_host}}' },
          { id: 'mysql_user', label: 'User', placeholder: 'root', type: 'text', token: '{{mysql_user}}' },
          { id: 'mysql_pass', label: 'Password', placeholder: '', type: 'password', token: '{{mysql_pass}}' },
          { id: 'mysql_db', label: 'Database', placeholder: 'mydb', type: 'text', token: '{{mysql_db}}' }
        ]
      },
      {
        id: 'db-redis', title: 'Redis', pkg: 'redis-mcp-server',
        cmd: 'npx', args: ['-y', 'redis-mcp-server@{{version}}'],
        desc: 'Read/write Redis keys, lists, hashes. Local or remote.',
        badges: ['local'], version: '1.0.0',
        env: { REDIS_URL: '{{redis_url}}' },
        inputs: [{ id: 'redis_url', label: 'Redis URL', placeholder: 'redis://localhost:6379', type: 'text', token: '{{redis_url}}' }]
      },
      {
        id: 'db-mongodb', title: 'MongoDB', pkg: 'mcp-server-mongodb',
        cmd: 'npx', args: ['-y', 'mcp-server-mongodb@{{version}}'],
        desc: 'Query and manage MongoDB collections and documents.',
        badges: ['local'], version: '1.0.0',
        env: { MONGODB_URI: '{{mongo_uri}}' },
        inputs: [{ id: 'mongo_uri', label: 'MongoDB URI', placeholder: 'mongodb://localhost:27017', type: 'text', token: '{{mongo_uri}}' }]
      },
      {
        id: 'db-supabase', title: 'Supabase', pkg: 'mcp-server-supabase',
        cmd: 'npx', args: ['-y', 'mcp-server-supabase@{{version}}'],
        desc: 'Interact with Supabase projects: DB, Auth, Storage.',
        badges: ['key'], version: '1.0.0',
        env: { SUPABASE_URL: '{{supa_url}}', SUPABASE_KEY: '{{supa_key}}' },
        inputs: [
          { id: 'supa_url', label: 'Project URL', placeholder: 'https://xyz.supabase.co', type: 'text', token: '{{supa_url}}' },
          { id: 'supa_key', label: 'Anon/Service Key', placeholder: '', type: 'password', token: '{{supa_key}}' }
        ]
      }
    ]
  },
  {
    id: 'browser', icon: MousePointer2, name: 'Browser & Scraping',
    servers: [
      {
        id: 'br-playwright', title: 'Playwright MCP', pkg: '@playwright/mcp',
        cmd: 'npx', args: ['-y', '@playwright/mcp@{{version}}'],
        desc: 'Full browser automation — click, type, screenshot, scrape. Runs locally.',
        badges: ['local'], version: '0.1.5', inputs: []
      },
      {
        id: 'br-puppeteer', title: 'Puppeteer', pkg: '@modelcontextprotocol/server-puppeteer',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer@{{version}}'],
        desc: 'Headless Chrome control via Puppeteer. Navigate, screenshot, evaluate JS.',
        badges: ['local'], version: '0.6.2', inputs: []
      }
    ]
  },
  {
    id: 'memory', icon: Brain, name: 'Memory & Knowledge',
    servers: [
      {
        id: 'mem-core', title: 'Memory (KV graph)', pkg: '@modelcontextprotocol/server-memory',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-memory@{{version}}'],
        desc: 'Persistent entity/relationship memory graph stored locally. No cloud.',
        badges: ['local'], version: '0.6.2', inputs: []
      },
      {
        id: 'mem-obsidian', title: 'Obsidian Vault', pkg: 'mcp-obsidian',
        cmd: 'npx', args: ['-y', 'mcp-obsidian@{{version}}', '{{vault_path}}'],
        desc: 'Read and search notes in a local Obsidian vault.',
        badges: ['local'], version: '1.0.0',
        inputs: [{ id: 'vault_path', label: 'Vault Path', placeholder: '/home/user/obsidian-vault', type: 'text', token: '{{vault_path}}' }]
      }
    ]
  },
  {
    id: 'ai', icon: Bot, name: 'AI & LLM (Local)',
    servers: [
      {
        id: 'ai-ollama', title: 'Ollama', pkg: 'mcp-ollama',
        cmd: 'npx', args: ['-y', 'mcp-ollama@{{version}}'],
        desc: 'Run prompts against local Ollama models. Fully offline.',
        badges: ['local'], version: '0.1.0',
        env: { OLLAMA_HOST: '{{ollama_host}}' },
        inputs: [{ id: 'ollama_host', label: 'Ollama Host', placeholder: 'http://localhost:11434', type: 'text', token: '{{ollama_host}}' }]
      },
      {
        id: 'ai-openai', title: 'OpenAI', pkg: '@modelcontextprotocol/server-openai',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-openai@{{version}}'],
        desc: 'Access OpenAI models (GPT-4o, o1, etc.) as tools.',
        badges: ['key'], version: '0.6.2',
        env: { OPENAI_API_KEY: '{{OPENAI_API_KEY}}' },
        inputs: [{ id: 'OPENAI_API_KEY', label: 'OpenAI API Key', placeholder: 'sk-…', type: 'password', token: '{{OPENAI_API_KEY}}' }]
      },
      {
        id: 'ai-openrouter', title: 'OpenRouter', pkg: 'openrouter-mcp-server',
        cmd: 'npx', args: ['-y', 'openrouter-mcp-server@{{version}}'],
        desc: 'Access 200+ models via OpenRouter unified API.',
        badges: ['key'], version: '1.0.0',
        env: { OPENROUTER_API_KEY: '{{OPENROUTER_API_KEY}}' },
        inputs: [{ id: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key', placeholder: 'sk-or-…', type: 'password', token: '{{OPENROUTER_API_KEY}}' }]
      },
      {
        id: 'ai-huggingface', title: 'Hugging Face', pkg: 'mcp-server-huggingface',
        cmd: 'npx', args: ['-y', 'mcp-server-huggingface@{{version}}'],
        desc: 'Search models, datasets, and run inference via Hugging Face API.',
        badges: ['key'], version: '1.0.0',
        env: { HF_TOKEN: '{{HF_TOKEN}}' },
        inputs: [{ id: 'HF_TOKEN', label: 'HF Token', placeholder: 'hf_…', type: 'password', token: '{{HF_TOKEN}}' }]
      },
      {
        id: 'ai-think', title: 'Sequential Thinking', pkg: '@modelcontextprotocol/server-sequential-thinking',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking@{{version}}'],
        desc: 'Structured step-by-step reasoning tool. No key, pure logic scaffold.',
        badges: ['local'], version: '0.6.2', inputs: []
      }
    ]
  },
  {
    id: 'devops', icon: Cloud, name: 'DevOps & Cloud',
    servers: [
      {
        id: 'do-docker', title: 'Docker', pkg: 'docker-mcp',
        cmd: 'npx', args: ['-y', 'docker-mcp@{{version}}'],
        desc: 'Manage local Docker containers, images, volumes, networks.',
        badges: ['local'], version: '1.0.0', inputs: []
      },
      {
        id: 'do-kubernetes', title: 'Kubernetes', pkg: '@modelcontextprotocol/server-kubernetes',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-kubernetes@{{version}}'],
        desc: 'kubectl-style cluster ops via local kubeconfig.',
        badges: ['local'], version: '0.6.2', inputs: []
      },
      {
        id: 'do-aws', title: 'AWS', pkg: '@modelcontextprotocol/server-aws',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-aws@{{version}}'],
        desc: 'S3, EC2, Lambda, RDS and more via AWS SDK credentials.',
        badges: ['key'], version: '0.6.2',
        env: { AWS_ACCESS_KEY_ID: '{{AWS_ACCESS_KEY_ID}}', AWS_SECRET_ACCESS_KEY: '{{AWS_SECRET_ACCESS_KEY}}', AWS_REGION: '{{AWS_REGION}}' },
        inputs: [
          { id: 'AWS_ACCESS_KEY_ID', label: 'Access Key ID', placeholder: 'AKIA…', type: 'text', token: '{{AWS_ACCESS_KEY_ID}}' },
          { id: 'AWS_SECRET_ACCESS_KEY', label: 'Secret Access Key', placeholder: '', type: 'password', token: '{{AWS_SECRET_ACCESS_KEY}}' },
          { id: 'AWS_REGION', label: 'Region', placeholder: 'us-east-1', type: 'text', token: '{{AWS_REGION}}' }
        ]
      },
      {
        id: 'do-tf', title: 'Terraform', pkg: '@hashicorp/terraform-mcp-server',
        cmd: 'npx', args: ['-y', '@hashicorp/terraform-mcp-server@{{version}}'],
        desc: 'Browse Terraform Registry, modules, providers and docs.',
        badges: ['local'], version: '1.0.0', inputs: []
      },
      {
        id: 'do-gcp', title: 'Google Cloud (GCP)', pkg: 'mcp-server-gcp',
        cmd: 'npx', args: ['-y', 'mcp-server-gcp@{{version}}'],
        desc: 'Manage GCP resources: Compute, Storage, GKE, Cloud Run.',
        badges: ['key'], version: '1.0.0',
        env: { GOOGLE_APPLICATION_CREDENTIALS: '{{GCP_PATH}}' },
        inputs: [{ id: 'GCP_PATH', label: 'Service Account JSON Path', placeholder: '/path/to/key.json', type: 'text', token: '{{GCP_PATH}}' }]
      },
      {
        id: 'do-azure', title: 'Azure', pkg: 'mcp-server-azure',
        cmd: 'npx', args: ['-y', 'mcp-server-azure@{{version}}'],
        desc: 'Manage Azure resources: VMs, App Service, SQL, Storage.',
        badges: ['key'], version: '1.0.0',
        env: { AZURE_SUBSCRIPTION_ID: '{{AZ_SUB}}', AZURE_TENANT_ID: '{{AZ_TENANT}}' },
        inputs: [
          { id: 'AZ_SUB', label: 'Subscription ID', placeholder: '', type: 'text', token: '{{AZ_SUB}}' },
          { id: 'AZ_TENANT', label: 'Tenant ID', placeholder: '', type: 'text', token: '{{AZ_TENANT}}' }
        ]
      }
    ]
  },
  {
    id: 'terminal', icon: Terminal, name: 'Terminal & Shell',
    servers: [
      {
        id: 'sh-shell', title: 'Shell (local)', pkg: 'mcp-shell',
        cmd: 'npx', args: ['-y', 'mcp-shell@{{version}}'],
        desc: 'Execute shell commands on your local machine. Use with caution.',
        badges: ['local'], version: '1.0.0', inputs: []
      },
      {
        id: 'sh-time', title: 'Time & Timezone', pkg: '@modelcontextprotocol/server-time',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-time@{{version}}'],
        desc: 'Current time and timezone conversions. Zero deps.',
        badges: ['local'], version: '0.6.2', inputs: []
      }
    ]
  },
  {
    id: 'network', icon: Network, name: 'Network & Infrastructure',
    servers: [
      {
        id: 'net-netbox', title: 'NetBox', pkg: 'netbox-mcp-server',
        cmd: 'npx', args: ['-y', 'netbox-mcp-server@{{version}}'],
        desc: 'Query/manage NetBox DCIM/IPAM: devices, IPs, prefixes, racks.',
        badges: ['key'], version: '1.0.0',
        env: { NETBOX_URL: '{{NETBOX_URL}}', NETBOX_TOKEN: '{{NETBOX_TOKEN}}' },
        inputs: [
          { id: 'NETBOX_URL', label: 'NetBox URL', placeholder: 'http://localhost:8000', type: 'text', token: '{{NETBOX_URL}}' },
          { id: 'NETBOX_TOKEN', label: 'API Token', placeholder: 'Token xxxxxxxxxx', type: 'password', token: '{{NETBOX_TOKEN}}' }
        ]
      },
      {
        id: 'net-fetch', title: 'REST / HTTP Client', pkg: '@modelcontextprotocol/server-fetch',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch@{{version}}'],
        desc: 'Make HTTP requests to any local or remote REST endpoint.',
        badges: ['local'], version: '0.6.2', inputs: []
      },
      {
        id: 'net-maps', title: 'Google Maps', pkg: '@modelcontextprotocol/server-google-maps',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-google-maps@{{version}}'],
        desc: 'Geocoding, directions, place search via Google Maps API.',
        badges: ['key'], version: '0.6.2',
        env: { GOOGLE_MAPS_API_KEY: '{{GOOGLE_MAPS_API_KEY}}' },
        inputs: [{ id: 'GOOGLE_MAPS_API_KEY', label: 'Maps API Key', placeholder: 'AIza…', type: 'password', token: '{{GOOGLE_MAPS_API_KEY}}' }]
      }
    ]
  },
  {
    id: 'comms', icon: MessageSquare, name: 'Comms & Productivity',
    servers: [
      {
        id: 'cm-slack', title: 'Slack', pkg: '@modelcontextprotocol/server-slack',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-slack@{{version}}'],
        desc: 'Read/send Slack messages, search channels, manage threads.',
        badges: ['key'], version: '0.6.2',
        env: { SLACK_BOT_TOKEN: '{{SLACK_BOT_TOKEN}}', SLACK_TEAM_ID: '{{SLACK_TEAM_ID}}' },
        inputs: [
          { id: 'SLACK_BOT_TOKEN', label: 'Bot Token', placeholder: 'xoxb-…', type: 'password', token: '{{SLACK_BOT_TOKEN}}' },
          { id: 'SLACK_TEAM_ID', label: 'Team ID', placeholder: 'T0XXXXXXX', type: 'text', token: '{{SLACK_TEAM_ID}}' }
        ]
      },
      {
        id: 'cm-notion', title: 'Notion', pkg: '@modelcontextprotocol/server-notion',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-notion@{{version}}'],
        desc: 'Read/write Notion pages, databases, blocks.',
        badges: ['key'], version: '0.6.2',
        env: { NOTION_API_TOKEN: '{{NOTION_TOKEN}}' },
        inputs: [{ id: 'NOTION_TOKEN', label: 'Integration Token', placeholder: 'secret_…', type: 'password', token: '{{NOTION_TOKEN}}' }]
      },
      {
        id: 'cm-gmail', title: 'Gmail', pkg: '@modelcontextprotocol/server-gmail',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-gmail@{{version}}'],
        desc: 'Read, search, send Gmail via OAuth2 credentials.',
        badges: ['key'], version: '0.6.2',
        env: { GMAIL_CLIENT_ID: '{{GMAIL_CLIENT_ID}}', GMAIL_CLIENT_SECRET: '{{GMAIL_SECRET}}' },
        inputs: [
          { id: 'GMAIL_CLIENT_ID', label: 'OAuth Client ID', placeholder: 'xxx.apps.googleusercontent.com', type: 'text', token: '{{GMAIL_CLIENT_ID}}' },
          { id: 'GMAIL_SECRET', label: 'OAuth Client Secret', placeholder: 'GOCSPX-…', type: 'password', token: '{{GMAIL_SECRET}}' }
        ]
      },
      {
        id: 'cm-linear', title: 'Linear', pkg: '@modelcontextprotocol/server-linear',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-linear@{{version}}'],
        desc: 'Manage Linear issues, projects, and cycles.',
        badges: ['key'], version: '0.6.2',
        env: { LINEAR_API_KEY: '{{LINEAR_KEY}}' },
        inputs: [{ id: 'LINEAR_KEY', label: 'Linear API Key', placeholder: 'lin_api_…', type: 'password', token: '{{LINEAR_KEY}}' }]
      },
      {
        id: 'cm-jira', title: 'Jira', pkg: 'mcp-server-jira',
        cmd: 'npx', args: ['-y', 'mcp-server-jira@{{version}}'],
        desc: 'Interact with Jira Cloud: issues, projects, boards.',
        badges: ['key'], version: '1.0.0',
        env: { JIRA_URL: '{{JIRA_URL}}', JIRA_EMAIL: '{{JIRA_EMAIL}}', JIRA_TOKEN: '{{JIRA_TOKEN}}' },
        inputs: [
          { id: 'JIRA_URL', label: 'Jira URL', placeholder: 'https://your-domain.atlassian.net', type: 'text', token: '{{JIRA_URL}}' },
          { id: 'JIRA_EMAIL', label: 'Email', placeholder: 'user@example.com', type: 'text', token: '{{JIRA_EMAIL}}' },
          { id: 'JIRA_TOKEN', label: 'API Token', placeholder: '', type: 'password', token: '{{JIRA_TOKEN}}' }
        ]
      },
      {
        id: 'cm-google-calendar', title: 'Google Calendar', pkg: '@modelcontextprotocol/server-google-calendar',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-google-calendar@{{version}}'],
        desc: 'Read, search, and manage Google Calendar events.',
        badges: ['key'], version: '0.6.2',
        env: { GCal_CLIENT_ID: '{{GCAL_CLIENT_ID}}', GCal_CLIENT_SECRET: '{{GCAL_SECRET}}' },
        inputs: [
          { id: 'GCAL_CLIENT_ID', label: 'OAuth Client ID', placeholder: 'xxx.apps.googleusercontent.com', type: 'text', token: '{{GCAL_CLIENT_ID}}' },
          { id: 'GCAL_SECRET', label: 'OAuth Client Secret', placeholder: 'GOCSPX-…', type: 'password', token: '{{GCAL_SECRET}}' }
        ]
      },
      {
        id: 'cm-discord', title: 'Discord', pkg: '@modelcontextprotocol/server-discord',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-discord@{{version}}'],
        desc: 'Interact with Discord servers and channels.',
        badges: ['key'], version: '0.6.2',
        env: { DISCORD_TOKEN: '{{DISCORD_TOKEN}}' },
        inputs: [
          { id: 'DISCORD_TOKEN', label: 'Bot Token', placeholder: 'MTAx...', type: 'password', token: '{{DISCORD_TOKEN}}' }
        ]
      }
    ]
  },
  {
    id: 'data', icon: BarChart3, name: 'Data & Analytics',
    servers: [
      {
        id: 'da-excel', title: 'Excel / CSV', pkg: '@modelcontextprotocol/server-excel',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-excel@{{version}}'],
        desc: 'Read, filter, transform local Excel (.xlsx) and CSV files.',
        badges: ['local'], version: '0.6.2', inputs: []
      },
      {
        id: 'da-sqlite-analysis', title: 'SQLite Analysis', pkg: '@modelcontextprotocol/server-sqlite',
        cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-sqlite@{{version}}', '--db-path', '{{analysis_db}}'],
        desc: 'Dedicated SQLite instance for data analysis and aggregation.',
        badges: ['local'], version: '0.6.2',
        inputs: [{ id: 'analysis_db', label: 'Analysis DB Path', placeholder: '/home/user/analysis.db', type: 'text', token: '{{analysis_db}}' }]
      }
    ]
  },
  {
    id: 'external', icon: Network, name: 'External & APIs',
    servers: [
      {
        id: 'ex-spotify', title: 'Spotify', pkg: 'mcp-server-spotify',
        cmd: 'npx', args: ['-y', 'mcp-server-spotify@{{version}}'],
        desc: 'Control playback, search tracks, and manage playlists.',
        badges: ['key'], version: '1.0.0',
        env: { SPOTIFY_CLIENT_ID: '{{SPOT_ID}}', SPOTIFY_CLIENT_SECRET: '{{SPOT_SECRET}}' },
        inputs: [
          { id: 'SPOT_ID', label: 'Client ID', placeholder: '', type: 'text', token: '{{SPOT_ID}}' },
          { id: 'SPOT_SECRET', label: 'Client Secret', placeholder: '', type: 'password', token: '{{SPOT_SECRET}}' }
        ]
      },
      {
        id: 'ex-stripe', title: 'Stripe', pkg: 'mcp-server-stripe',
        cmd: 'npx', args: ['-y', 'mcp-server-stripe@{{version}}'],
        desc: 'Query customers, subscriptions, and payments via Stripe API.',
        badges: ['key'], version: '1.0.0',
        env: { STRIPE_API_KEY: '{{STRIPE_KEY}}' },
        inputs: [{ id: 'STRIPE_KEY', label: 'Secret Key', placeholder: 'sk_test_…', type: 'password', token: '{{STRIPE_KEY}}' }]
      },
      {
        id: 'ex-twilio', title: 'Twilio', pkg: 'mcp-server-twilio',
        cmd: 'npx', args: ['-y', 'mcp-server-twilio@{{version}}'],
        desc: 'Send SMS, make calls, and manage Twilio resources.',
        badges: ['key'], version: '1.0.0',
        env: { TWILIO_ACCOUNT_SID: '{{TW_SID}}', TWILIO_AUTH_TOKEN: '{{TW_TOKEN}}' },
        inputs: [
          { id: 'TW_SID', label: 'Account SID', placeholder: 'AC…', type: 'text', token: '{{TW_SID}}' },
          { id: 'TW_TOKEN', label: 'Auth Token', placeholder: '', type: 'password', token: '{{TW_TOKEN}}' }
        ]
      },
      {
        id: 'ex-youtube', title: 'YouTube', pkg: 'mcp-server-youtube',
        cmd: 'npx', args: ['-y', 'mcp-server-youtube@{{version}}'],
        desc: 'Search videos, get transcripts, and manage channel data.',
        badges: ['key'], version: '1.0.0',
        env: { YOUTUBE_API_KEY: '{{YT_KEY}}' },
        inputs: [{ id: 'YT_KEY', label: 'YouTube API Key', placeholder: '', type: 'password', token: '{{YT_KEY}}' }]
      }
    ]
  }
];

// --- Components ---

export default function App() {
  const [selIDE, setSelIDE] = useState<string | null>(null);
  const [selServers, setSelServers] = useState<Record<string, { def: ServerDef; vals: Record<string, string> }>>({});
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('mcp-theme') as 'dark' | 'light') || 'dark');
  const [searchTerm, setSearchTerm] = useState('');

  // Theme application
  useEffect(() => {
    localStorage.setItem('mcp-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);
  
  // Settings State
  const [tavilyKey, setTavilyKey] = useState(() => localStorage.getItem('mcp-tavily-key') || '');
  const [tavilySearch, setTavilySearch] = useState('');
  const [validationProvider, setValidationProvider] = useState(() => localStorage.getItem('mcp-val-provider') || 'gemini');
  const [validationKey, setValidationKey] = useState(() => localStorage.getItem(`mcp-val-key-${localStorage.getItem('mcp-val-provider') || 'gemini'}`) || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [tavilyResults, setTavilyResults] = useState<any[]>([]);
  const [isSearchingTavily, setIsSearchingTavily] = useState(false);
  const [isExtracting, setIsExtracting] = useState<number | null>(null);
  const [customServers, setCustomServers] = useState<ServerDef[]>(() => JSON.parse(localStorage.getItem('mcp-custom-servers') || '[]'));

  const filteredServers = useMemo(() => {
    const results: ServerDef[] = [];
    const term = searchTerm.toLowerCase().trim();
    
    // Search in Catalogue
    CATALOGUE.forEach(cat => {
      cat.servers.forEach(srv => {
        if (!term || srv.title.toLowerCase().includes(term) || srv.desc.toLowerCase().includes(term) || srv.pkg.toLowerCase().includes(term)) {
          if (!results.find(r => r.id === srv.id)) results.push(srv);
        }
      });
    });

    // Search in Custom (Extracted) Servers
    customServers.forEach(srv => {
      if (!term || srv.title.toLowerCase().includes(term) || srv.desc.toLowerCase().includes(term) || srv.pkg.toLowerCase().includes(term)) {
        if (!results.find(r => r.id === srv.id)) results.push(srv);
      }
    });

    return term ? results : [];
  }, [searchTerm, customServers]);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<any[]>(() => JSON.parse(localStorage.getItem('mcp-saved-configs') || '[]'));
  const [pendingLoad, setPendingLoad] = useState<any>(null);

  const resetServers = () => {
    if (Object.keys(selServers).length === 0) return;
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setSelServers({});
    setGeneratedConfig(null);
    setValidationResult(null);
    setShowResetConfirm(false);
  };

  // Persist keys
  useEffect(() => {
    localStorage.setItem('mcp-tavily-key', tavilyKey);
  }, [tavilyKey]);

  useEffect(() => {
    localStorage.setItem('mcp-val-provider', validationProvider);
    setValidationKey(localStorage.getItem(`mcp-val-key-${validationProvider}`) || '');
  }, [validationProvider]);

  useEffect(() => {
    if (validationKey) {
      localStorage.setItem(`mcp-val-key-${validationProvider}`, validationKey);
    }
  }, [validationKey, validationProvider]);

  // Load saved server keys
  useEffect(() => {
    const savedKeys = localStorage.getItem('mcp-server-keys');
    if (savedKeys) {
      const parsed = JSON.parse(savedKeys);
      setSelServers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(srvId => {
          if (parsed[srvId]) {
            next[srvId].vals = { ...next[srvId].vals, ...parsed[srvId] };
          }
        });
        return next;
      });
    }
  }, []);

  // Save server keys on change
  useEffect(() => {
    const keysToSave: Record<string, Record<string, string>> = {};
    (Object.entries(selServers) as [string, { def: ServerDef; vals: Record<string, string> }][]).forEach(([srvId, data]) => {
      const sensitiveVals: Record<string, string> = {};
      data.def.inputs.forEach(inp => {
        if (inp.type === 'password' && data.vals[inp.id]) {
          sensitiveVals[inp.id] = data.vals[inp.id];
        }
      });
      if (Object.keys(sensitiveVals).length > 0) {
        keysToSave[srvId] = sensitiveVals;
      }
    });
    localStorage.setItem('mcp-server-keys', JSON.stringify(keysToSave));
  }, [selServers]);

  const toggleCat = (catId: string) => {
    setOpenCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    CATALOGUE.forEach(cat => {
      all[cat.id] = true;
    });
    setOpenCats(all);
  };

  const collapseAll = () => {
    setOpenCats({});
  };

  const toggleSrv = (srv: ServerDef) => {
    setSelServers(prev => {
      const next = { ...prev };
      if (next[srv.id]) {
        delete next[srv.id];
      } else {
        next[srv.id] = { def: srv, vals: {} };
      }
      return next;
    });
  };

  const updateInp = (srvId: string, inpId: string, val: string) => {
    setSelServers(prev => {
      if (!prev[srvId]) return prev;
      return {
        ...prev,
        [srvId]: {
          ...prev[srvId],
          vals: { ...prev[srvId].vals, [inpId]: val }
        }
      };
    });
  };

  const resolveArgs = (srv: { def: ServerDef; vals: Record<string, string> }) => {
    const { def, vals } = srv;
    const version = vals.version || def.version || 'latest';
    
    return def.args.map(a => {
      let r = a;
      // Resolve version first
      r = r.replace('{{version}}', version);
      // Resolve other tokens
      Object.entries(vals).forEach(([k, v]) => {
        if (v) r = r.replace(`{{${k}}}`, v);
      });
      return r;
    }).filter(a => !a.includes('{{'));
  };

  const resolveEnv = (env: Record<string, string> | undefined, vals: Record<string, string>) => {
    if (!env) return {};
    const out: Record<string, string> = {};
    Object.entries(env).forEach(([k, tmpl]) => {
      const token = tmpl.replace(/{{|}}/g, '').trim();
      out[k] = vals[token] || tmpl;
    });
    return out;
  };

  const generate = async () => {
    if (!selIDE) return;
    setIsGenerating(true);
    setGeneratedConfig(null);
    
    // Simulate generation delay
    await new Promise(r => setTimeout(r, 800));
    
    const ide = IDE_DEFS[selIDE];
    const entries = Object.values(selServers) as { def: ServerDef; vals: Record<string, string> }[];
    let configObj: any = {};

    if (ide.format === 'vscode') {
      const inputs: any = {};
      const mcpServers: any = {};
      entries.forEach(({ def, vals }) => {
        const env = resolveEnv(def.env, vals);
        const envFinal: any = {};
        Object.entries(env).forEach(([k, v]) => {
          if (String(v).includes('{{')) {
            const key = k.toLowerCase();
            inputs[key] = { type: 'promptString', description: k.replace(/_/g, ' '), password: /key|token|secret|pass/i.test(k) };
            envFinal[k] = `\${input:${key}}`;
          } else {
            envFinal[k] = v;
          }
        });
        mcpServers[def.id] = { command: def.cmd, args: resolveArgs({ def, vals }), env: envFinal };
      });
      configObj = { mcpServers };
      if (Object.keys(inputs).length) configObj.inputs = inputs;
    } else if (ide.format === 'opencode') {
      const mcpServers: any = {};
      entries.forEach(({ def, vals }) => {
        mcpServers[def.id] = { command: def.cmd, args: resolveArgs({ def, vals }), env: resolveEnv(def.env, vals) };
      });
      configObj = { mcpServers };
    } else {
      const mcpServers: any = {};
      entries.forEach(({ def, vals }) => {
        mcpServers[def.id] = { command: def.cmd, args: resolveArgs({ def, vals }), env: resolveEnv(def.env, vals) };
      });
      configObj = { mcpServers };
    }

    setGeneratedConfig(JSON.stringify(configObj, null, 2));
    setIsGenerating(false);
  };

  const doCopy = () => {
    if (!generatedConfig) return;
    navigator.clipboard.writeText(generatedConfig);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  const browseFolder = async (srvId: string, inpId: string) => {
    try {
      // @ts-ignore
      if (!window.showDirectoryPicker) {
        alert("Your browser doesn't support the Directory Picker API or it's blocked in this context.");
        return;
      }
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();
      if (dirHandle) {
        // Note: Browser security prevents getting the full absolute path (e.g. C:\Users\...)
        // We'll set the name and add a placeholder hint.
        updateInp(srvId, inpId, `[VERIFY PATH]/${dirHandle.name}`);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    }
  };

  const [isPrefetching, setIsPrefetching] = useState(false);

  useEffect(() => {
    if (showSettings) {
      // Simulate prefetch when settings open or provider changes
      setIsPrefetching(true);
      const timer = setTimeout(() => setIsPrefetching(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [showSettings, validationProvider]);

  const validateConfig = async () => {
    if (!generatedConfig) return;
    setIsValidating(true);
    setValidationResult(null);

    try {
      const ideInfo = selIDE ? IDE_DEFS[selIDE] : null;
      const contextPrompt = `
        Validate this MCP configuration for correctness and JSON format.
        CRITICAL: The user is running this locally on their own PC. 
        DO NOT flag servers like 'mcp-shell', 'playwright', 'puppeteer', or 'filesystem' as security risks. 
        The user explicitly wants these servers and is aware of their capabilities. 
        ONLY flag them if the JSON syntax is invalid or if the structure does not match the requirements for the ${ideInfo?.label || 'selected'} IDE.
        Focus entirely on structural validity and syntax.
        Return JSON with "success" (boolean) and "message" (string).
        Config:
        ${generatedConfig}
      `;

      if (validationProvider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: validationKey || process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: contextPrompt,
          config: { responseMimeType: "application/json" }
        });
        const res = JSON.parse(response.text || '{}');
        setValidationResult({ success: res.success ?? true, message: res.message || "Config is valid" });
      } else if (validationProvider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': validationKey,
            'anthropic-version': '2023-06-01',
            'dangerously-allow-browser': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: contextPrompt }]
          })
        });
        const data = await response.json();
        const text = data.content[0].text;
        const res = JSON.parse(text.match(/\{.*\}/s)?.[0] || '{}');
        setValidationResult({ success: res.success ?? true, message: res.message || "Config is valid" });
      } else if (validationProvider === 'mistral') {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validationKey}`
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: contextPrompt }],
            response_format: { type: 'json_object' }
          })
        });
        const data = await response.json();
        const res = JSON.parse(data.choices[0].message.content);
        setValidationResult({ success: res.success ?? true, message: res.message || "Config is valid" });
      } else if (validationProvider === 'openrouter') {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validationKey}`
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o',
            messages: [{ role: 'user', content: contextPrompt }]
          })
        });
        const data = await response.json();
        const res = JSON.parse(data.choices[0].message.content.match(/\{.*\}/s)?.[0] || '{}');
        setValidationResult({ success: res.success ?? true, message: res.message || "Config is valid" });
      }
    } catch (e: any) {
      setValidationResult({ success: false, message: e.message || "Validation failed" });
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('mcp-custom-servers', JSON.stringify(customServers));
  }, [customServers]);

  const handleTavilySearch = async () => {
    if (!tavilySearch.trim() || !tavilyKey) return;
    setIsSearchingTavily(true);
    setTavilyResults([]);
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: `MCP server configuration for ${tavilySearch}`,
          search_depth: "advanced",
          include_domains: [
            "github.com/modelcontextprotocol/servers",
            "github.com/punkpeye/awesome-mcp-servers",
            "github.com/wong2/awesome-mcp-servers",
            "github.com/appcypher/awesome-mcp-servers",
            "mcpservers.org",
            "mcp.so",
            "glama.ai"
          ],
          max_results: 6
        })
      });
      const data = await response.json();
      setTavilyResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingTavily(false);
    }
  };

  const addWebResult = async (result: any, index: number) => {
    if (isExtracting !== null) return;
    setIsExtracting(index);
    
    try {
      const ai = new GoogleGenAI({ apiKey: validationKey || process.env.GEMINI_API_KEY });
      const prompt = `
        Extract the Model Context Protocol (MCP) server configuration from this search result.
        Title: ${result.title}
        Snippet: ${result.content}
        URL: ${result.url}

        Return a JSON object matching this TypeScript interface:
        interface ServerDef {
          id: string; // unique slug
          title: string;
          pkg: string; // npm package name or repo
          cmd: string; // usually "npx"
          args: string[]; // e.g. ["-y", "pkg-name", "--arg"]
          desc: string; // brief description
          badges: ('local' | 'key' | 'docker')[];
          inputs: { id: string; label: string; placeholder: string; type: 'text' | 'password'; token: string }[];
          env?: Record<string, string>; // e.g. { API_KEY: "{{API_KEY}}" }
        }

        If you find environment variables, add them to 'env' and create corresponding 'inputs'.
        Use "{{token_name}}" syntax in args or env values to match input IDs.
        If no clear config is found, try to infer the most likely "npx" command.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const serverDef: ServerDef = JSON.parse(response.text || '{}');
      if (serverDef.id && serverDef.cmd) {
        // Add to custom servers list
        setCustomServers(prev => {
          if (prev.find(s => s.id === serverDef.id)) return prev;
          return [...prev, serverDef];
        });
        // Select it
        setSelServers(prev => ({
          ...prev,
          [serverDef.id]: { def: serverDef, vals: {} }
        }));
        // Close settings to show the added server
        setShowSettings(false);
        setSearchTerm(serverDef.title);
      }
    } catch (err) {
      console.error("Failed to extract server config", err);
    } finally {
      setIsExtracting(null);
    }
  };

  const highlight = (json: string) => {
    return json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m => {
        if (/^"/.test(m)) return /:$/.test(m) ? `<span class="text-cyan">${m}</span>` : `<span class="text-green">${m}</span>`;
        return `<span class="text-amber">${m}</span>`;
      });
  };

  const saveConfig = () => {
    const serversToSave = Object.keys(selServers);
    if (serversToSave.length === 0) {
      return;
    }
    const name = prompt("Enter a name for this configuration:", `MCP Config ${new Date().toLocaleDateString()}`);
    if (!name) return;
    
    const newConfig = {
      id: Date.now().toString(),
      name,
      ide: selIDE,
      servers: serversToSave,
      serverData: Object.fromEntries(
        (Object.entries(selServers) as [string, { def: ServerDef; vals: Record<string, string> }][]).map(([id, data]) => [id, { vals: data.vals }])
      ),
      config: generatedConfig,
      date: new Date().toISOString()
    };

    const updated = [...savedConfigs, newConfig];
    setSavedConfigs(updated);
    localStorage.setItem('mcp-saved-configs', JSON.stringify(updated));
  };

  const exportConfig = () => {
    const serversToSave = Object.keys(selServers);
    if (serversToSave.length === 0) return;
    
    const data = {
      ide: selIDE,
      servers: serversToSave,
      serverData: Object.fromEntries(
        (Object.entries(selServers) as [string, { def: ServerDef; vals: Record<string, string> }][]).map(([id, data]) => [id, { vals: data.vals }])
      ),
      config: generatedConfig,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.servers) {
          setPendingLoad(data);
        }
      } catch (err) {
        console.error("Failed to parse JSON", err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeLoad = (selected: any, append: boolean) => {
    const newServers: Record<string, { def: ServerDef; vals: Record<string, string> }> = append ? { ...selServers } : {};
    
    selected.servers.forEach((srvId: string) => {
      CATALOGUE.forEach(cat => {
        const found = cat.servers.find(s => s.id === srvId);
        if (found) {
          const savedVals = selected.serverData?.[srvId]?.vals || {};
          if (newServers[srvId]) {
            newServers[srvId].vals = { ...newServers[srvId].vals, ...savedVals };
          } else {
            newServers[srvId] = { def: found, vals: savedVals };
          }
        }
      });
    });

    if (selected.ide) setSelIDE(selected.ide);
    setSelServers(newServers);
    if (selected.config) setGeneratedConfig(selected.config);
    setPendingLoad(null);
    setShowSavedModal(false);
  };

  const deleteSavedConfig = (id: string) => {
    const updated = savedConfigs.filter(c => c.id !== id);
    setSavedConfigs(updated);
    localStorage.setItem('mcp-saved-configs', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans transition-colors duration-300">
      <div className="container mx-auto max-w-[980px] px-5 py-10 pb-24">
        {/* Header */}
        <header className="text-center flex flex-col items-center gap-2 mb-12">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-cyan" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"></path>
            </svg>
            <h1 className="text-3xl font-bold tracking-tight text-bright">MCP Config Generator</h1>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="ml-2 p-1.5 rounded-full hover:bg-surface transition-colors text-dim hover:text-bright"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-dim uppercase tracking-[0.2em] font-medium mt-1">
            <span>LOCAL-FIRST</span>
            <span>•</span>
            <span>PICK YOUR IDE</span>
            <span>•</span>
            <span>SPECIFIC SERVERS</span>
            <span>•</span>
            <span>READY TO-PASTE CONFIG</span>
          </div>
        </header>

        {/* Step 1: IDE Selection */}
        <section className="mb-10">
          <h2 className="text-[11px] font-bold tracking-[0.15em] text-bright uppercase mb-5">01 SELECT YOUR IDE</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.values(IDE_DEFS).map(ide => {
              const isSelected = selIDE === ide.id;
              return (
                <button
                  key={ide.id}
                  onClick={() => setSelIDE(ide.id)}
                  className={`bg-surface border rounded-xl p-5 flex flex-col items-center text-center gap-4 transition-all duration-200 group relative ${
                    isSelected 
                      ? 'border-cyan bg-cyan/5 shadow-[0_0_15px_rgba(201,124,101,0.1)]' 
                      : 'border-border hover:border-dim'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
                    ide.id === 'vscode' ? 'bg-blue-500 text-white' :
                    ide.id === 'claudecode' ? 'bg-cyan text-white font-bold font-serif text-lg' :
                    ide.id === 'anythingllm' ? 'border border-dim text-dim' :
                    'bg-zinc-800 text-white rounded-full'
                  }`}>
                    {ide.id === 'vscode' ? <Terminal size={22} /> :
                     ide.id === 'claudecode' ? 'AI' :
                     ide.id === 'anythingllm' ? <Brain size={22} /> :
                     <GitBranch size={22} />}
                  </div>
                  <div>
                    <h3 className={`font-semibold text-[13px] mb-1.5 ${isSelected ? 'text-cyan' : 'text-bright'}`}>{ide.label}</h3>
                    <p className="text-[11px] text-dim leading-relaxed px-2">
                      {ide.id === 'vscode' ? 'Pick the config for your VS Code.' :
                       ide.id === 'claudecode' ? 'Claude Code session list authorizations.' :
                       ide.id === 'anythingllm' ? 'AnythingLLM to collection, can definitely.' :
                       'Set is the linux to munts endsmss.'}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--color-cyan)]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

      {/* Settings Section */}
      <section className="mb-7">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="mb-3 flex w-full items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-cyan hover:opacity-80"
        >
          <Settings size={12} />
          SETTINGS
          <div className="h-[1px] flex-1 bg-border"></div>
          <ChevronRight size={12} className={`transition-transform ${showSettings ? 'rotate-90' : ''}`} />
        </button>
        
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border border-border bg-surface p-4 space-y-6">
                {/* Tavily Search */}
                <div>
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-amber">
                    <Search size={12} />
                    TAVILY MCP CONFIG SEARCH
                  </div>
                  <p className="mb-3 text-[11px] text-dim leading-relaxed">
                    Search the web for MCP server configurations using Tavily's AI-powered search.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-wider text-dim w-16">API KEY</span>
                      <input 
                        type="password" 
                        value={tavilyKey}
                        onChange={(e) => setTavilyKey(e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="flex-1 bg-bg border border-border p-1.5 px-2.5 text-[11px] text-bright outline-none focus:border-cyan"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={tavilySearch}
                        onChange={(e) => setTavilySearch(e.target.value)}
                        placeholder="Search for MCP config..."
                        className="flex-1 bg-bg border border-border p-1.5 px-2.5 text-[11px] text-bright outline-none focus:border-cyan"
                      />
                      <button 
                        onClick={handleTavilySearch}
                        disabled={isSearchingTavily || !tavilyKey}
                        className="border border-border bg-surface2 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-dim hover:border-cyan hover:text-cyan disabled:opacity-30"
                      >
                        {isSearchingTavily ? <Loader2 size={12} className="animate-spin" /> : 'SEARCH'}
                      </button>
                    </div>

                    {tavilyResults.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="text-[9px] uppercase tracking-widest text-dim flex justify-between items-center">
                          <span>Web Results (Restricted Sources)</span>
                          <span className="opacity-50">Powered by Tavily</span>
                        </div>
                        {tavilyResults.map((res, i) => (
                          <div key={i} className="p-4 border border-border bg-bg rounded-xl group hover:border-cyan transition-colors">
                            <div className="flex justify-between items-start gap-4 mb-2">
                              <div className="flex-1">
                                <div className="text-[12px] font-bold text-bright mb-1 group-hover:text-cyan transition-colors">{res.title}</div>
                                <div className="text-[9px] text-dim font-mono truncate max-w-[250px]">{res.url}</div>
                              </div>
                              <button 
                                onClick={() => addWebResult(res, i)}
                                disabled={isExtracting !== null}
                                className="bg-cyan/10 border border-cyan/20 text-cyan px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-cyan hover:text-bg transition-all flex items-center gap-1.5"
                              >
                                {isExtracting === i ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                {isExtracting === i ? 'Extracting...' : 'Add to List'}
                              </button>
                            </div>
                            <p className="text-[11px] text-dim line-clamp-3 mb-3 leading-relaxed">{res.content}</p>
                            <a 
                              href={res.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[9px] text-dim hover:text-cyan flex items-center gap-1 w-fit"
                            >
                              <Globe size={10} />
                              View Source
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-[1px] bg-border"></div>

                {/* Validation Endpoint */}
                <div>
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-amber">
                    <ShieldCheck size={12} />
                    CONFIG VALIDATION ENDPOINT
                    {isPrefetching && (
                      <span className="ml-auto flex items-center gap-1 text-dim lowercase italic">
                        <Loader2 size={10} className="animate-spin" />
                        prefetching model...
                      </span>
                    )}
                  </div>
                  <p className="mb-3 text-[11px] text-dim leading-relaxed">
                    Validate your generated MCP config against an AI model for correctness.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { id: 'gemini', name: 'Google Gemini', url: 'https://generativelanguage.googleapis...' },
                      { id: 'mistral', name: 'Mistral AI', url: 'https://api.mistral.ai/v1' },
                      { id: 'anthropic', name: 'Anthropic', url: 'https://api.anthropic.com/v1' },
                      { id: 'openrouter', name: 'OpenRouter', url: 'https://openrouter.ai/api/v1' }
                    ].map(provider => (
                      <button
                        key={provider.id}
                        onClick={() => setValidationProvider(provider.id)}
                        className={`border p-2.5 text-left transition-all ${
                          validationProvider === provider.id 
                            ? 'border-purple bg-[rgba(199,146,234,0.05)] text-purple' 
                            : 'border-border bg-surface2 text-dim hover:border-purple'
                        }`}
                      >
                        <div className="text-[11px] font-medium">{provider.name}</div>
                        <div className="text-[9px] opacity-60 truncate">{provider.url}</div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-wider text-dim w-24">
                        {validationProvider.toUpperCase()} KEY
                      </span>
                      <input 
                        type="password" 
                        value={validationKey}
                        onChange={(e) => setValidationKey(e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="flex-1 bg-bg border border-border p-1.5 px-2.5 text-[11px] text-bright outline-none focus:border-cyan"
                      />
                    </div>
                    <button 
                      onClick={validateConfig}
                      disabled={!generatedConfig || isValidating}
                      className="w-full border border-purple bg-transparent py-2.5 text-[10px] font-medium uppercase tracking-widest text-purple hover:bg-[rgba(199,146,234,0.1)] disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                      {isValidating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                      VALIDATE CONFIG
                    </button>
                    
                    {validationResult && (
                      <div className={`mt-2 border p-2 px-3 text-[11px] flex items-center gap-2 ${
                        validationResult.success ? 'border-green/30 bg-green/5 text-green' : 'border-red/30 bg-red/5 text-red'
                      }`}>
                        {validationResult.success ? <Check size={12} /> : <Zap size={12} />}
                        {validationResult.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Step 2: Server Selection */}
      <section className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-bold tracking-[0.15em] text-bright uppercase">02 CHOOSE MCP SERVERS</h2>
            {searchTerm && (
              <span className="text-[10px] text-cyan bg-cyan/5 border border-cyan/20 px-2 py-0.5 rounded-full animate-pulse">
                Filtering...
              </span>
            )}
          </div>
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={14} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search 50+ servers (github, postgres, search...)"
              className="w-full bg-surface border border-border rounded-lg py-2 pl-10 pr-4 text-[13px] text-bright outline-none focus:border-cyan transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-bright"
              >
                <Plus size={14} className="rotate-45" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={expandAll}
                className="text-[9px] font-bold text-dim hover:text-cyan transition-colors tracking-[0.1em]"
              >
                EXPAND ALL
              </button>
              <button 
                onClick={collapseAll}
                className="text-[9px] font-bold text-dim hover:text-cyan transition-colors tracking-[0.1em]"
              >
                COLLAPSE ALL
              </button>
            </div>
            <div className="h-3 w-[1px] bg-border"></div>
            <button 
              onClick={resetServers}
              disabled={Object.keys(selServers).length === 0}
              className="flex items-center gap-1.5 text-[9px] font-bold text-dim hover:text-red transition-colors disabled:opacity-30 tracking-[0.1em]"
            >
              <Plus size={10} className="rotate-45" />
              RESET SELECTION
            </button>
          </div>
        </div>

        {/* Search Results */}
        <AnimatePresence>
          {searchTerm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-10"
            >
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[10px] font-bold text-cyan uppercase tracking-wider">Search Results</h3>
                <span className="text-[10px] text-dim bg-surface border border-border px-1.5 py-0.5 rounded">{filteredServers.length} found</span>
              </div>
              
              {filteredServers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredServers.map(s => {
                    const isSelected = !!selServers[s.id];
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleSrv(s)}
                        className={`border rounded-xl p-5 cursor-pointer transition-all relative flex flex-col gap-3 group ${
                          isSelected
                            ? 'border-cyan bg-cyan/5 shadow-[0_0_15px_rgba(201,124,101,0.05)]'
                            : 'border-border bg-surface hover:border-dim hover:bg-surface2'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`text-[14px] font-bold ${isSelected ? 'text-bright' : 'text-bright'}`}>{s.title}</h4>
                            <p className="text-[10px] text-dim font-mono mt-0.5">{s.pkg}</p>
                          </div>
                          <button
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-cyan text-bg shadow-[0_0_10px_rgba(201,124,101,0.3)]' 
                                : 'bg-bg border border-border text-dim group-hover:border-cyan group-hover:text-cyan'
                            }`}
                          >
                            {isSelected ? <Check size={16} strokeWidth={3} /> : <Plus size={16} />}
                          </button>
                        </div>
                        <p className="text-[11px] text-dim leading-relaxed line-clamp-2">
                          {s.desc}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {s.badges.map(b => (
                            <span key={b} className="text-[9px] px-1.5 py-0.5 bg-bg border border-border rounded text-dim uppercase tracking-tighter">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 border border-dashed border-border rounded-xl text-center">
                  <p className="text-dim text-[13px] mb-2">No local servers found matching "{searchTerm}"</p>
                  {tavilyKey ? (
                    <button 
                      onClick={() => {
                        setTavilySearch(searchTerm);
                        handleTavilySearch();
                        setShowSettings(true);
                      }}
                      className="text-cyan hover:underline text-[11px] flex items-center gap-1 mx-auto"
                    >
                      <Globe size={12} />
                      Search the web for "{searchTerm}" config?
                    </button>
                  ) : (
                    <p className="text-[11px] text-dim/60">Try a different keyword or configure Tavily in Settings for web search.</p>
                  )}
                </div>
              )}
              <div className="h-[1px] w-full bg-border mt-10"></div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-2">
          {CATALOGUE.map(cat => {
            const selCount = cat.servers.filter(s => selServers[s.id]).length;
            const isOpen = openCats[cat.id];
            return (
              <div key={cat.id} className={`border rounded-lg transition-all ${isOpen ? 'border-border bg-surface/30' : 'border-border bg-surface hover:bg-surface2'}`}>
                <button
                  onClick={() => toggleCat(cat.id)}
                  className={`flex w-full items-center gap-3 p-4 transition-colors ${isOpen ? 'border-b border-border' : ''}`}
                >
                  <ChevronRight size={14} className={`text-dim transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                  <span className={`flex-1 text-left text-[13px] font-semibold ${isOpen ? 'text-bright' : 'text-dim'}`}>{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-medium ${selCount > 0 ? 'text-cyan' : 'text-dim'}`}>
                      {selCount}
                    </span>
                    <ChevronRight size={14} className={`text-dim transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        {cat.servers.map(s => {
                          const isSelected = !!selServers[s.id];
                          return (
                            <div
                              key={s.id}
                              onClick={() => toggleSrv(s)}
                              className={`border rounded-lg p-4 cursor-pointer transition-all relative flex flex-col gap-3 ${
                                isSelected
                                  ? 'border-cyan bg-cyan/5'
                                  : 'border-border bg-surface hover:border-dim'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <h4 className={`text-[13px] font-semibold ${isSelected ? 'text-bright' : 'text-bright'}`}>{s.title}</h4>
                                <div className={`w-4.5 h-4.5 border rounded flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-cyan border-cyan text-bg' : 'border-dim bg-transparent'
                                }`}>
                                  {isSelected && <Check size={12} strokeWidth={3} />}
                                </div>
                              </div>
                              <p className="text-[11px] text-dim leading-snug h-8 overflow-hidden line-clamp-2">
                                {s.desc}
                              </p>
                              <div className="mt-auto pt-2">
                                <label className="block text-[9px] font-bold text-dim uppercase tracking-wider mb-1.5">Package Version</label>
                                <input
                                  type="text"
                                  value={selServers[s.id]?.vals.version || s.version || 'latest'}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => updateInp(s.id, 'version', e.target.value)}
                                  placeholder="latest"
                                  className="w-full bg-bg border border-border rounded p-1.5 px-2 text-[11px] text-bright outline-none focus:border-cyan transition-colors"
                                />
                              </div>
                              {isSelected && s.inputs.length > 0 && (
                                <div className="mt-1 flex flex-col gap-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
                                  {s.inputs.map(inp => (
                                    <div key={inp.id} className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-bold uppercase tracking-wider text-dim">{inp.label}</span>
                                          {inp.id === 'path' && (
                                            <button 
                                              onClick={() => browseFolder(s.id, inp.id)}
                                              className="text-[9px] text-cyan hover:underline uppercase font-bold"
                                            >
                                              Browse
                                            </button>
                                          )}
                                        </div>
                                        <input
                                          type={inp.type}
                                          value={selServers[s.id].vals[inp.id] || ''}
                                          onChange={e => updateInp(s.id, inp.id, e.target.value)}
                                          placeholder={inp.placeholder}
                                          className="w-full bg-bg border border-border rounded p-1.5 px-2 text-[11px] text-bright outline-none focus:border-cyan transition-colors"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Custom Servers Category */}
          {customServers.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden bg-surface mt-2">
              <button 
                onClick={() => toggleCat('custom-extracted')}
                className="w-full flex items-center justify-between p-4 hover:bg-surface2 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${openCats['custom-extracted'] ? 'bg-purple text-bg' : 'bg-bg text-dim group-hover:text-purple'}`}>
                    <Zap size={16} />
                  </div>
                  <div className="text-left">
                    <span className="text-[12px] font-bold text-bright block">Extracted from Web</span>
                    <span className="text-[9px] text-dim uppercase tracking-wider">{customServers.length} Servers</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ChevronRight size={16} className={`text-dim transition-transform duration-300 ${openCats['custom-extracted'] ? 'rotate-90' : ''}`} />
                </div>
              </button>
              
              <AnimatePresence>
                {openCats['custom-extracted'] && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-bg/30">
                      {customServers.map(srv => (
                        <div 
                          key={srv.id}
                          onClick={() => toggleSrv(srv)}
                          className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                            selServers[srv.id] 
                              ? 'border-purple bg-purple/5' 
                              : 'border-border bg-surface hover:border-dim'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[13px] font-bold text-bright truncate">{srv.title}</span>
                              <Trash2 
                                size={12} 
                                className="text-dim hover:text-red ml-auto cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCustomServers(prev => prev.filter(s => s.id !== srv.id));
                                  setSelServers(prev => {
                                    const next = { ...prev };
                                    delete next[srv.id];
                                    return next;
                                  });
                                }}
                              />
                            </div>
                            <p className="text-[11px] text-dim line-clamp-1">{srv.desc}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            selServers[srv.id] ? 'bg-purple text-bg' : 'bg-bg border border-border text-dim group-hover:border-purple group-hover:text-purple'
                          }`}>
                            {selServers[srv.id] ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* Step 3: Generate & Actions */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold tracking-[0.15em] text-bright uppercase mb-5">03 GENERATE & ACTIONS</h2>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={generate}
            disabled={!selIDE || Object.keys(selServers).length === 0 || isGenerating}
            className="bg-cyan hover:bg-cyan/90 text-bg font-bold py-3.5 px-8 rounded-lg text-[13px] tracking-[0.05em] transition-all flex-grow sm:flex-grow-0 uppercase shadow-lg shadow-cyan/10 disabled:opacity-50 disabled:shadow-none"
          >
            {isGenerating ? 'GENERATING...' : 'GENERATE MCP CONFIG'}
          </button>
          <div className="flex gap-2">
            <button 
              onClick={saveConfig}
              className="bg-surface border border-border hover:bg-surface2 text-bright py-2 px-5 rounded-lg text-[11px] font-bold transition-colors uppercase tracking-wider"
            >
              SAVE
            </button>
            <button 
              onClick={exportConfig}
              className="bg-surface border border-border hover:bg-surface2 text-bright py-2 px-5 rounded-lg text-[11px] font-bold transition-colors uppercase tracking-wider"
            >
              EXPORT
            </button>
            <label className="bg-surface border border-border hover:bg-surface2 text-bright py-2 px-5 rounded-lg text-[11px] font-bold transition-colors uppercase tracking-wider cursor-pointer">
              IMPORT
              <input type="file" className="hidden" accept=".json" onChange={importConfig} />
            </label>
            <button 
              onClick={() => setShowSavedModal(true)}
              className="bg-surface border border-border hover:bg-surface2 text-bright py-2 px-5 rounded-lg text-[11px] font-bold transition-colors uppercase tracking-wider"
            >
              SAVED
            </button>
          </div>
        </div>
      </section>

      {/* Modals */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm p-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md border border-border bg-surface p-6 shadow-2xl"
            >
              <h3 className="text-lg font-medium text-bright mb-2">Clear Selection?</h3>
              <p className="text-sm text-dim mb-6">This will remove all selected MCP servers and reset your configuration. This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-sm text-dim hover:text-bright transition-colors">Cancel</button>
                <button onClick={confirmReset} className="px-4 py-2 text-sm bg-red/10 text-red border border-red/20 hover:bg-red/20 transition-colors">Reset Everything</button>
              </div>
            </motion.div>
          </div>
        )}

        {pendingLoad && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm p-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md border border-border bg-surface p-6 shadow-2xl"
            >
              <h3 className="text-lg font-medium text-bright mb-2">Load Configuration</h3>
              <p className="text-sm text-dim mb-6">How would you like to load this configuration?</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => executeLoad(pendingLoad, true)} 
                  className="w-full p-3 text-sm text-left border border-border hover:border-cyan hover:bg-cyan/5 transition-all flex items-center justify-between"
                >
                  <span>Append to current selection</span>
                  <Plus size={14} className="text-cyan" />
                </button>
                <button 
                  onClick={() => executeLoad(pendingLoad, false)} 
                  className="w-full p-3 text-sm text-left border border-border hover:border-red hover:bg-red/5 transition-all flex items-center justify-between"
                >
                  <span>Replace current selection</span>
                  <RefreshCw size={14} className="text-red" />
                </button>
                <button 
                  onClick={() => setPendingLoad(null)} 
                  className="mt-2 w-full p-2 text-xs text-center text-dim hover:text-bright transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showSavedModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm p-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-2xl max-h-[80vh] border border-border bg-surface flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <h3 className="text-lg font-medium text-bright">Saved Configurations</h3>
                <button onClick={() => setShowSavedModal(false)} className="text-dim hover:text-bright transition-colors">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {savedConfigs.length === 0 ? (
                  <div className="text-center py-10 text-dim">No saved configurations yet.</div>
                ) : (
                  savedConfigs.map(cfg => (
                    <div key={cfg.id} className="border border-border bg-surface2 p-4 flex items-center justify-between group">
                      <div>
                        <div className="text-sm font-medium text-bright">{cfg.name}</div>
                        <div className="text-[10px] text-dim mt-1">
                          {cfg.servers.length} servers • {cfg.ide} • {new Date(cfg.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setPendingLoad(cfg)}
                          className="p-2 text-cyan hover:bg-cyan/10 transition-colors"
                          title="Load"
                        >
                          <FolderOpen size={16} />
                        </button>
                        <button 
                          onClick={() => deleteSavedConfig(cfg.id)}
                          className="p-2 text-dim hover:text-red hover:bg-red/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Step 4: Your Config */}
      <AnimatePresence>
        {generatedConfig && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 pb-10"
          >
            <h2 className="text-[11px] font-bold tracking-[0.15em] text-bright uppercase mb-5">04 YOUR CONFIG</h2>
            <div className="relative group">
              <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={doCopy}
                  className="p-2 bg-surface/80 backdrop-blur border border-border rounded-md text-dim hover:text-cyan transition-colors"
                  title="Copy to clipboard"
                >
                  {copyDone ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="bg-bg border border-border rounded-xl p-6 overflow-hidden shadow-inner">
                <pre className="text-[13px] font-mono text-dim overflow-x-auto no-scrollbar leading-relaxed">
                  <code className="block">
                    {generatedConfig.split('\n').map((line, i) => {
                      // Simple syntax highlighting for keys
                      const parts = line.split(/(".*?"):/);
                      return (
                        <div key={i}>
                          {parts.map((p, j) => (
                            <span key={j} className={p.startsWith('"') && p.endsWith('"') ? 'text-cyan' : ''}>
                              {p}{j === 1 ? ':' : ''}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </code>
                </pre>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[11px] text-dim italic flex items-center gap-2">
                  <Bot size={12} />
                  Prompt to paste your config generated // {new Date().toLocaleDateString()} in #mcp-generator
                </p>
                <div className="flex items-center gap-2 text-[10px] text-dim tracking-wider">
                  <div className="h-1.5 w-1.5 rounded-full bg-green shadow-[0_0_5px_var(--color-green)] blink-animation"></div>
                  {IDE_DEFS[selIDE!].filename}
                </div>
              </div>
              
              <div className="mt-6 border border-amber/20 bg-amber/5 p-4 rounded-lg text-[11px] leading-relaxed">
                <strong className="text-amber block mb-1">📌 {IDE_DEFS[selIDE!].label} Setup:</strong>
                <div className="text-dim" dangerouslySetInnerHTML={{ __html: IDE_DEFS[selIDE!].note }} />
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="mt-12 pt-6 border-t border-border flex justify-between items-center text-[10px] text-dim uppercase tracking-widest font-medium">
        <span>MCP Config Generator v2.5</span>
        <div className="flex items-center gap-4">
          <span>Powered by Claude</span>
          <span className="h-3 w-[1px] bg-border"></span>
          <span>AfflictedAI</span>
        </div>
      </footer>
    </div>
  </div>
  );
}
