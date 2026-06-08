import { Activity, Send, Bot, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate } from 'react-router-dom';
import { sendChatMessage } from '../api/chatbotApi';

interface ChatbotPageProps {
  onBackToDashboard?: () => void;
}

type ChatMessage = { type: 'bot' | 'user'; content: string };

const initialBotMessage: ChatMessage = {
  type: 'bot',
  content:
    "## Welcome to Chamora!\n\nI'm your **AI-powered assistant** designed to help you with:\n\n- **Performance analysis** — deep insights into your application's behaviour\n- **Edge case testing** — identify and resolve tricky test scenarios\n- **Workflow optimization** — streamline your testing pipeline\n- **Intelligent recommendations** — actionable guidance powered by RAG\n\nHow can I help you today?"
};

const mdComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 mt-2 pb-2 border-b border-indigo-100">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 mt-4 pb-1 border-b border-indigo-100">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-base font-bold text-indigo-700 mb-2 mt-3">{children}</h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-sm font-bold text-purple-700 mb-2 mt-3 uppercase tracking-wide">{children}</h4>
  ),
  p: ({ children }: any) => (
    <p className="text-slate-700 leading-7 mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="space-y-1.5 mb-3 pl-1">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="space-y-1.5 mb-3 pl-1">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="flex items-start gap-2.5 text-slate-700 leading-6">
      <span className="mt-2 w-2 h-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-indigo-800">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-purple-700">{children}</em>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-indigo-400 bg-indigo-50/60 pl-4 pr-3 py-2 my-3 rounded-r-lg text-slate-600 italic">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-4 border-0 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
  ),
  a: ({ children, ...props }: any) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 underline decoration-indigo-300 hover:text-purple-600 transition-colors"
    >
      {children}
    </a>
  ),
  code: ({ node, inline, className, children, ...props }: any) => {
    if (inline) {
      return (
        <code className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }
    return (
      <div className="my-4 rounded-xl overflow-hidden shadow-md border border-slate-700">
        <div className="flex items-center gap-1.5 bg-slate-800 px-4 py-2.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="ml-2 text-xs text-slate-400 font-mono">code</span>
        </div>
        <pre className="bg-slate-900 text-slate-100 px-5 py-4 overflow-auto text-sm font-mono leading-6" {...props}>
          <code className={className}>{children}</code>
        </pre>
      </div>
    );
  },
  table: ({ children }: any) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-indigo-100 shadow-sm">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">{children}</thead>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-2.5 border-t border-indigo-50 text-slate-700">{children}</td>
  ),
  tr: ({ children }: any) => (
    <tr className="even:bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors">{children}</tr>
  ),
};

export function ChatbotPage({ onBackToDashboard }: ChatbotPageProps) {
  const { appId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([initialBotMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(appId || '1', userMessage);
      setMessages(prev => [...prev, { type: 'bot', content: response.answer }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { type: 'bot', content: '**Error:** Failed to connect to the AI backend. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation Bar */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-md">
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              if (onBackToDashboard) {
                onBackToDashboard();
              } else {
                navigate(`/application/${appId}`);
              }
            }}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Chamora
              </h1>
              <p className="text-xs text-slate-600 font-medium">AI Performance Intelligence Engine</p>
            </div>
          </button>

          <div className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl shadow-sm">
            <span className="text-sm text-slate-700 font-medium">Current Mode:</span>
            <span className="font-bold text-indigo-700">Advisory</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-600 font-semibold">Active</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white/80 backdrop-blur-sm">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-end gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md mb-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[78%] ${
                  msg.type === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl rounded-br-sm px-5 py-3.5 shadow-md'
                    : 'bg-white border border-indigo-100 rounded-2xl rounded-bl-sm px-6 py-5 shadow-sm'
                }`}>
                  {msg.type === 'bot' ? (
                    <ReactMarkdown components={mdComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-white leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {msg.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0 shadow-md mb-1">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-end gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-indigo-100 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 px-6 py-5 bg-white/90 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end bg-white border-2 border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 rounded-2xl px-4 py-3 shadow-sm transition-all">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your application… (Shift+Enter for new line)"
                className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none resize-none text-sm leading-6"
                rows={1}
                style={{ minHeight: '28px', maxHeight: '140px' }}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                className="flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-200 disabled:to-slate-300 text-white p-2.5 rounded-xl transition-all shadow hover:shadow-md disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-3">
              AI-powered assistance for performance analysis and testing optimization
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
