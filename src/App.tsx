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
    <div className="container mx-auto max-w-[980px] px-5 py-10 pb-24">
      {/* Header */}
      <header className="header relative mb-9 border-b border-border pb-5.5 after:absolute after:bottom-[-1px] after:left-0 after:h-[1px] after:w-[130px] after:bg-cyan after:shadow-[0_0_10px_var(--color-cyan)]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3.5">
            <div className="logo-animation flex h-8 w-8 items-center justify-center border-[1.5px] border-cyan text-[11px] font-semibold text-cyan shadow-[0_0_12px_rgba(0,212,255,0.18),inset_0_0_8px_rgba(0,212,255,0.05)]">
              MCP
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-bright">MCP Config Generator</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 border border-border bg-surface text-dim hover:text-cyan hover:border-cyan transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
        <div className="font-sans text-[10px] uppercase tracking-widest text-dim">
          Local-first • Pick your IDE + specific servers &rarr; ready-to-paste config
        </div>
      </header>

      {/* Step 1: IDE Selection */}
      <section className="mb-7">
        <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-cyan">
          01 &nbsp; Select Your IDE
          <div className="h-[1px] flex-1 bg-border"></div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-[7px]">
          {Object.values(IDE_DEFS).map(ide => (
            <button
              key={ide.id}
              onClick={() => setSelIDE(ide.id)}
              className={`flex flex-col gap-0.5 border p-[11px_13px] text-left transition-all duration-150 relative ${
                selIDE === ide.id 
                  ? 'border-amber bg-[rgba(245,166,35,0.07)] text-amber shadow-[0_0_12px_rgba(245,166,35,0.13)]' 
                  : 'border-border bg-surface text-dim hover:border-amber hover:bg-[rgba(245,166,35,0.05)] hover:text-amber'
              }`}
            >
              <span className="text-[11px] font-medium">{ide.label}</span>
              <span className={`text-[10px] opacity-60 ${selIDE === ide.id ? 'text-amber opacity-50' : 'text-dim'}`}>
                {ide.filename}
              </span>
              {selIDE === ide.id && <span className="absolute top-[7px] right-[9px] text-[7px] text-green">●</span>}
            </button>
          ))}
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
                      <button className="border border-border bg-surface2 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-dim hover:border-cyan hover:text-cyan">
                        SEARCH
                      </button>
                    </div>
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
      <section className="mb-7">
        <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-cyan">
          02 &nbsp; Choose MCP Servers
          <div className="h-[1px] flex-1 bg-border"></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={expandAll}
                className="text-[9px] font-semibold text-dim hover:text-cyan transition-colors tracking-wider"
              >
                EXPAND ALL
              </button>
              <button 
                onClick={collapseAll}
                className="text-[9px] font-semibold text-dim hover:text-cyan transition-colors tracking-wider"
              >
                COLLAPSE ALL
              </button>
            </div>
            <div className="h-3 w-[1px] bg-border"></div>
            <button 
              onClick={resetServers}
              disabled={Object.keys(selServers).length === 0}
              className="flex items-center gap-1 text-dim hover:text-red transition-colors disabled:opacity-30 disabled:hover:text-dim"
            >
              <Plus size={12} className="rotate-45" />
              RESET SELECTION
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {CATALOGUE.map(cat => {
            const selCount = cat.servers.filter(s => selServers[s.id]).length;
            return (
              <div key={cat.id} className="border border-border bg-surface">
                <button
                  onClick={() => toggleCat(cat.id)}
                  className={`flex w-full items-center gap-2.5 p-[10px_14px] transition-colors hover:bg-white/[0.02] ${openCats[cat.id] ? 'border-b border-border' : ''}`}
                >
                  <cat.icon size={14} className="text-bright" />
                  <span className="flex-1 text-left text-[12px] font-medium text-bright">{cat.name}</span>
                  <span className={`border border-border px-2 py-0.5 text-[10px] ${selCount > 0 ? 'border-green text-green' : 'text-dim'}`}>
                    {selCount} selected
                  </span>
                  <ChevronRight size={10} className={`text-dim transition-transform duration-200 ${openCats[cat.id] ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence>
                  {openCats[cat.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2 p-3">
                        {cat.servers.map(s => (
                          <div
                            key={s.id}
                            onClick={() => toggleSrv(s)}
                            className={`flex-1 min-w-[200px] max-w-[320px] border p-[9px_13px] cursor-pointer transition-all relative ${
                              selServers[s.id]
                                ? 'border-green bg-[rgba(0,255,136,0.05)] shadow-[0_0_10px_rgba(0,255,136,0.08)]'
                                : 'border-border bg-surface2 hover:border-purple hover:bg-[rgba(199,146,234,0.04)]'
                            }`}
                          >
                            <div className="text-[12px] font-medium text-bright mb-0.5">{s.title}</div>
                            <div className="text-[10px] text-dim font-mono">{s.pkg}</div>
                            <div className="text-[10px] text-dim mt-1 leading-relaxed">{s.desc}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.badges.map(b => (
                                <span key={b} className={`text-[9px] px-1.5 py-0.5 border rounded-sm font-sans ${
                                  b === 'local' ? 'bg-green/10 text-green border-green/20' :
                                  b === 'key' ? 'bg-amber/10 text-amber border-amber/20' :
                                  'bg-cyan/10 text-cyan border-cyan/20'
                                }`}>
                                  {b === 'local' ? 'local / offline' : b === 'key' ? 'API key needed' : 'docker'}
                                </span>
                              ))}
                            </div>
                            {selServers[s.id] && (
                              <>
                                <span className="absolute top-[6px] right-[10px] text-[10px] text-green">✓</span>
                                <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2" onClick={e => e.stopPropagation()}>
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] uppercase tracking-wider text-dim">Package Version</span>
                                    </div>
                                    <input
                                      type="text"
                                      value={selServers[s.id].vals.version || s.version || 'latest'}
                                      onChange={e => updateInp(s.id, 'version', e.target.value)}
                                      placeholder="e.g. 0.6.2 or latest"
                                      className="w-full bg-bg border border-border p-1 px-2 text-[11px] text-bright outline-none focus:border-cyan"
                                    />
                                  </div>
                                  {s.inputs.map(inp => (
                                    <div key={inp.id} className="flex flex-col gap-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] uppercase tracking-wider text-dim">{inp.label}</span>
                                          {inp.id === 'path' && (
                                            <button 
                                              onClick={() => browseFolder(s.id, inp.id)}
                                              className="text-[8px] text-cyan hover:underline uppercase tracking-tighter"
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
                                          className="w-full bg-bg border border-border p-1 px-2 text-[11px] text-bright outline-none focus:border-cyan"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Step 3: Generate */}
      <section className="mb-7">
        <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-cyan">
          03 &nbsp; Generate & Actions
          <div className="h-[1px] flex-1 bg-border"></div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={!selIDE || Object.keys(selServers).length === 0 || isGenerating}
            className="flex-1 border border-cyan bg-transparent p-3.5 text-[12px] font-medium uppercase tracking-widest text-cyan hover:bg-cyan hover:text-bg transition-all relative overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed group"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {isGenerating ? 'Building your config...' : 'Generate MCP Config'}
            </span>
          </button>
          <button
            onClick={saveConfig}
            className="border border-border bg-surface p-3.5 text-[12px] font-medium uppercase tracking-widest text-dim hover:text-cyan hover:border-cyan transition-all flex items-center gap-2"
            title="Save current selection to app"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={exportConfig}
            className="border border-border bg-surface p-3.5 text-[12px] font-medium uppercase tracking-widest text-dim hover:text-cyan hover:border-cyan transition-all flex items-center gap-2"
            title="Export to JSON file"
          >
            <Download size={14} />
            Export
          </button>
          <label className="border border-border bg-surface p-3.5 text-[12px] font-medium uppercase tracking-widest text-dim hover:text-cyan hover:border-cyan transition-all flex items-center gap-2 cursor-pointer">
            <Upload size={14} />
            Import
            <input type="file" accept=".json" onChange={importConfig} className="hidden" />
          </label>
          <button
            onClick={() => setShowSavedModal(true)}
            className="border border-border bg-surface p-3.5 text-[12px] font-medium uppercase tracking-widest text-dim hover:text-cyan hover:border-cyan transition-all flex items-center gap-2"
            title="View saved configurations"
          >
            <FolderOpen size={14} />
            Saved
          </button>
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

      {/* Step 4: Output */}
      <AnimatePresence>
        {generatedConfig && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-cyan">
              <div className="flex items-center gap-2">
                04 &nbsp; Your Config
                <div className="h-[1px] w-24 bg-border"></div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={saveConfig}
                  className="flex items-center gap-1 text-dim hover:text-cyan transition-colors"
                >
                  <Save size={12} />
                  Save Locally
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.values(selServers).map(({ def }) => (
                <span key={def.id} className="inline-flex items-center gap-1 bg-green/5 border border-green/20 text-green px-2 py-0.5 text-[10px] rounded-sm">
                  <span className="h-1 w-1 rounded-full bg-green"></span>
                  {def.title}
                </span>
              ))}
            </div>

            <div className="border border-border bg-[#0a1520] flex items-center justify-between p-[9px_13px]">
              <div className="flex items-center gap-2 text-[10px] text-dim tracking-wider">
                <div className="h-1.5 w-1.5 rounded-full bg-green shadow-[0_0_5px_var(--color-green)] blink-animation"></div>
                {IDE_DEFS[selIDE!].filename}
              </div>
              <button
                onClick={doCopy}
                className={`border px-3 py-1 text-[10px] transition-all ${copyDone ? 'border-green text-green' : 'border-border text-dim hover:border-green hover:text-green'}`}
              >
                {copyDone ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="code-block border border-border border-t-0 bg-[#0a0e14] p-4.5 overflow-auto max-h-[500px] text-[12px] leading-relaxed font-mono whitespace-pre"
                 dangerouslySetInnerHTML={{ __html: highlight(generatedConfig) }} />

            <div className="mt-3 border border-amber/20 bg-amber/5 p-[13px_15px] text-[11px] leading-relaxed">
              <strong className="text-amber">📌 {IDE_DEFS[selIDE!].label} Setup:</strong><br />
              <div dangerouslySetInnerHTML={{ __html: IDE_DEFS[selIDE!].note }} />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="mt-12 pt-4 border-t border-border flex justify-between text-[10px] text-dim">
        <span>MCP Config Generator v2</span>
        <span>Powered by Claude • AfflictedAI</span>
      </footer>
    </div>
  );
}
