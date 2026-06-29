import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ArrowLeft, 
  Check, 
  Copy, 
  ExternalLink, 
  Server, 
  Github, 
  Cpu, 
  LineChart, 
  Database, 
  Globe, 
  Activity, 
  BookOpen, 
  Terminal, 
  Settings, 
  CheckCircle2,
  ListCollapse
} from 'lucide-react';
import readmeContent from '../../../../README.md?raw';

const TESTING_REPO_URL = 'https://github.com/ranathungaWK/Automated-Testing-Environment-';

// Helper to generate IDs for headings
const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
};

// Custom Code Block component with copy functionality
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="not-prose">
      <div className="relative my-6 rounded-2xl bg-slate-900 text-slate-100 shadow-xl overflow-hidden border border-slate-800">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            {language || 'bash'}
          </span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed select-text">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

// Graphical Interactive Architecture Diagram component
function ArchitectureDiagram() {
  return (
    <div className="not-prose">
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 lg:p-8 my-8 shadow-inner">
        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6 text-center">
          Test Environment Architecture Diagram
        </h4>
        <div className="grid md:grid-cols-2 gap-8 relative">
          {/* Monitoring Stack */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <Server className="w-4 h-4" />
              </div>
              <h5 className="font-bold text-slate-800 text-sm">Monitoring Environment</h5>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between h-24">
                <div className="text-blue-600"><Database className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-xs text-slate-800">VictoriaMetrics</p>
                  <p className="text-[10px] text-slate-400">TSDB Storage</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between h-24">
                <div className="text-orange-500"><Activity className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-xs text-slate-800">Prometheus</p>
                  <p className="text-[10px] text-slate-400">Scraper / Collector</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between h-24">
                <div className="text-purple-600"><LineChart className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-xs text-slate-800">Grafana</p>
                  <p className="text-[10px] text-slate-400">Dashboards (Port 3002)</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between h-24">
                <div className="text-emerald-600"><Cpu className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-xs text-slate-800">Exporters</p>
                  <p className="text-[10px] text-slate-400">Node, cAdvisor, Blackbox</p>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2.5 mt-2 border border-slate-100 whitespace-normal break-words leading-relaxed">
              📌 <strong>Flow:</strong> Exporters collect metrics &rarr; Prometheus scrapes exporters &rarr; Prometheus remote-writes to VictoriaMetrics &rarr; Grafana queries VictoriaMetrics.
            </div>
          </div>

          {/* User Application */}
          <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-blue-100/50 pb-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <h5 className="font-bold text-blue-900 text-sm">Your Application</h5>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="font-medium text-xs text-slate-800">Backend / API Service</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Port 5000</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-medium text-xs text-slate-800">Frontend / Web Service</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Port 3000</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="font-medium text-xs text-slate-800">Database Service</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Postgres / MySQL</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-blue-800 bg-blue-100/50 rounded-lg p-2.5 mt-4 border border-blue-100/60 whitespace-normal break-words leading-relaxed">
              ⚡ Connected via the shared <code>monitoring</code> Docker network. The CLI tool merges these networks automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SetupTestingEnvironmentPage() {
  const [copyFeedback, setCopyFeedback] = useState('');

  const handleCopyRepo = async () => {
    await navigator.clipboard.writeText(TESTING_REPO_URL);
    setCopyFeedback('Repository URL copied!');
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  // Custom renderers to map markdown to beautiful Tailwind components
  const renderers = {
    h1: ({ children }: any) => {
      const text = React.Children.toArray(children).join('');
      const id = slugify(text);
      return (
        <h1 id={id} className="text-3xl lg:text-4xl font-extrabold text-slate-900 mt-10 mb-6 tracking-tight scroll-mt-24">
          {children}
        </h1>
      );
    },
    h2: ({ children }: any) => {
      const text = React.Children.toArray(children).join('');
      const id = slugify(text);
      return (
        <h2 id={id} className="text-2xl font-bold text-slate-900 mt-10 mb-4 pb-2 border-b border-slate-150 tracking-tight scroll-mt-24">
          {children}
        </h2>
      );
    },
    h3: ({ children }: any) => {
      const text = React.Children.toArray(children).join('');
      const id = slugify(text);
      return (
        <h3 id={id} className="text-xl font-bold text-slate-850 mt-6 mb-3 tracking-tight scroll-mt-24">
          {children}
        </h3>
      );
    },
    p: ({ children }: any) => (
      <p className="text-slate-600 mb-4 leading-relaxed text-[15px]">{children}</p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-600 text-[15px]">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-6 mb-6 space-y-2 text-slate-600 text-[15px]">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="pl-1 text-slate-600">{children}</li>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-6 bg-blue-50/50 rounded-r-2xl text-slate-700 italic">
        {children}
      </blockquote>
    ),
    a: ({ href, children }: any) => (
      <a 
        href={href} 
        target={href?.startsWith('http') ? '_blank' : undefined} 
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
      >
        {children}
        {href?.startsWith('http') && <ExternalLink className="w-3 h-3 inline" />}
      </a>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-6 border border-slate-200 rounded-2xl shadow-sm">
        <table className="w-full text-left border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs font-semibold uppercase">{children}</thead>
    ),
    tbody: ({ children }: any) => (
      <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
    ),
    tr: ({ children }: any) => (
      <tr className="hover:bg-slate-50/80 transition-colors">{children}</tr>
    ),
    th: ({ children }: any) => (
      <th className="px-5 py-3.5 font-semibold text-slate-800">{children}</th>
    ),
    td: ({ children }: any) => (
      <td className="px-5 py-3.5 text-slate-600">{children}</td>
    ),
    code: ({ className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      if (className === 'language-mermaid') {
        return <ArchitectureDiagram />;
      }
      
      if (!match) {
        return <code className="bg-slate-100 text-blue-600 font-mono text-[13.5px] px-1.5 py-0.5 rounded-md border border-slate-200" {...props}>{children}</code>;
      }
      
      return <CodeBlock code={codeString} language={match[1]} {...props} />;
    }
  };

  // Sections navigation structure based on README headers
  const navItems = [
    { label: 'Overview', id: 'universal-docker-monitoring--integration-environment' },
    { label: 'Key Features', id: 'key-features' },
    { label: 'Architecture Flow', id: 'architecture-flow' },
    { label: 'Quick Start Guide', id: 'quick-start-guide' },
    { label: 'CLI Reference', id: 'cli-reference' },
    { label: 'Verifying the Setup', id: 'verifying-the-setup' },
    { label: 'HMS Sample App', id: 'testing-with-the-decoupled-sample-application' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden flex flex-col font-sans">
      {/* Premium Sticky Navigation */}
      <nav className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-250/60 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 bg-blue-400 rounded-lg text-blue-900 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-blue-900">
                Chamora
              </h1>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Start
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Layout Container */}
      <div className="max-w-[1440px] mx-auto px-6 py-10 lg:py-12 w-full flex-grow">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          
          {/* Left Column: Documentation Body (pulled left and expanded) */}
          <main className="bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/40 p-8 lg:p-12 overflow-hidden select-text">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 bg-blue-100/50 text-blue-700 text-xs font-semibold mb-6">
              <BookOpen className="w-4 h-4" />
              SETUP GUIDE & DOCUMENTATION
            </div>
            
            {/* Markdown Renderer */}
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers}>
                {readmeContent}
              </ReactMarkdown>
            </div>
          </main>

          {/* Right Column: Outline, Repo Access & Environment Stats */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-28 font-sans">
            
            {/* Table of Contents Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg shadow-slate-200/50">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3 mb-3">
                <ListCollapse className="w-4 h-4 text-blue-500" />
                <span>On This Page</span>
              </div>
              <nav className="flex flex-col gap-1 border-l-2 border-slate-200">
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="pl-4 py-1.5 text-xs text-slate-500 hover:text-blue-600 hover:border-blue-500 border-l-2 border-transparent -ml-[2px] transition-all font-semibold duration-150 truncate block"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Clone Environment Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
              <div className="flex items-center gap-2.5 mb-4">
                <Github className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-bold">Testing Environment</h3>
              </div>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                Clone the official monitoring and testing environment stack into your local project workspace to get started.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleCopyRepo}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copy Repository URL
                </button>
                {copyFeedback && (
                  <p className="text-xs text-center text-emerald-400 font-medium animate-pulse">
                    {copyFeedback}
                  </p>
                )}
                <a
                  href={TESTING_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-200 rounded-xl font-semibold transition-all text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on GitHub
                </a>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}