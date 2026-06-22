import { Activity, Send, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { sendChatMessage, fetchChatMessages, fetchChatSessions } from '@/app/services/recommendationApi';
import type { ChatMessageItem } from '@/app/services/recommendationApi';

interface ComparisonChatState {
  applicationName: string;
  selectedCycles: Array<{
    id: number;
    name: string;
    date: string;
    status: string;
  }>;
  selectedMetrics: Array<{
    key: string;
    label: string;
    description?: string;
  }>;
  mode: 'test_comparison';
}

interface ChatbotPageProps {
  onBackToDashboard?: () => void;
}

interface DisplayMessage {
  type: 'user' | 'bot';
  content: string;
  details?: string | undefined;
}

function toDisplayMessage(item: ChatMessageItem): DisplayMessage {
  return {
    type: item.type === 'user' ? 'user' : 'bot',
    content: item.content,
    details: item.details ?? undefined,
  };
}

export function ChatbotPage({ onBackToDashboard }: ChatbotPageProps) {
  const { appId } = useParams<{ appId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const comparisonContext = location.state as ComparisonChatState | undefined;
  const comparisonMode = comparisonContext?.mode === 'test_comparison';

  const welcomeMessage: DisplayMessage = comparisonMode
    ? {
        type: 'bot',
        content: 'Comparison context loaded',
        details: `Ready to analyze ${comparisonContext!.selectedCycles.length} selected test runs for ${comparisonContext!.applicationName}. Pick a question below or type your own follow-up.`,
      }
    : {
        type: 'bot',
        content: 'Welcome to Chamora',
        details:
          "I'm your AI-powered assistant designed to help you with application performance analysis and provide intelligent recommendations, resolve edge case testing issues, optimize testing workflows, and much more.",
      };

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>(() => [welcomeMessage]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [currentMode, setCurrentMode] = useState('Advisory');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load the most recent session's messages for this app on mount
  useEffect(() => {
    if (!appId) return;
    fetchChatSessions(appId)
      .then((sessions) => {
        if (sessions.length === 0) return;
        const latest = sessions[0];
        setSessionId(latest.id);
        return fetchChatMessages(latest.id).then((items) => {
          if (items.length > 0) {
            setMessages(items.map(toDisplayMessage));
          }
        });
      })
      .catch(() => {
        // silently fall back to welcome message if history unavailable
      });
  }, [appId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestedQuestions = comparisonMode
    ? [
        'Which selected cycle regressed the most?',
        'Summarize the biggest performance differences across the chosen metrics.',
        'What should I inspect first in these comparison results?',
        'Turn this comparison into an executive summary.',
      ]
    : [
        'How do I improve test coverage?',
        'What are the most critical test failures?',
        'Common Module Performance Data',
        'How to identify memory leaks and regular memory footprints?',
        'Optimize API response times across different environments',
        'Implement load/stress testing techniques',
        'Streamlined Error Handling: how to improve handling and error logging for better debugging',
        'Improve database query efficiency and indexing strategies',
        'Implement monitoring, alerting, and observability for real-time issue detection',
        'Implement caching strategies to reduce database load and improve response times',
        'Implement security testing techniques including vulnerability scanning and penetration testing',
        'Use Pytest fixtures and mock objects to improve HTTP requests',
        'Implement load balancing to distribute traffic evenly and improve responsiveness',
        'Optimize front-end performance through minification, bundling, and lazy loading',
        'Memory usage and garbage collection frequency',
      ];

  const handleSend = async () => {
    const text = message.trim();
    if (!text || isSending || !appId) return;

    setMessages((prev) => [...prev, { type: 'user', content: text, details: undefined }]);
    setMessage('');
    setIsSending(true);

    try {
      const response = await sendChatMessage({
        app_id: appId,
        question: text,
        session_id: sessionId ?? undefined,
      });

      if (response.session_id) {
        setSessionId(response.session_id);
      }
      setCurrentMode(
        response.mode === 'test_comparison'
          ? 'Comparison'
          : response.mode === 'anomaly'
          ? 'Diagnostic'
          : 'Advisory',
      );
      setMessages((prev) => [
        ...prev,
        { type: 'bot', content: response.answer, details: undefined },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          type: 'bot',
          content: 'Error',
          details: err instanceof Error ? err.message : 'Failed to get a response. Please try again.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation Bar */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
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
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl shadow-sm">
            <span className="text-sm text-slate-700 font-medium">Current Mode:</span>
            <span className="font-bold text-indigo-700">{currentMode}</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-600 font-semibold">Active</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Chat Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto p-6">
          {comparisonMode && comparisonContext && (
            <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/90 px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-indigo-600 font-semibold">Comparison context</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-800">{comparisonContext.applicationName}</h2>
                  <p className="text-sm text-slate-600">The selected cycles and metrics are loaded into this chat session.</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 border border-indigo-200">
                  <Activity className="w-4 h-4" />
                  Comparison ready
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/70 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cycles</p>
                  <div className="mt-2 space-y-2">
                    {comparisonContext.selectedCycles.map((cycle) => (
                      <div key={cycle.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {cycle.name} · {cycle.date} · {cycle.status}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Metrics</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {comparisonContext.selectedMetrics.map((metric) => (
                      <span key={metric.key} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {metric.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="h-full bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-5xl mx-auto space-y-6">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-3xl ${
                        msg.type === 'user'
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-5 shadow-md'
                          : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-sm'
                      }`}
                    >
                      {msg.type === 'bot' && (
                        <div>
                          <h3 className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-3">
                            {msg.content}
                          </h3>
                          {msg.details && <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.details}</p>}
                        </div>
                      )}
                      {msg.type === 'user' && <p className="text-white">{msg.content}</p>}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 shadow-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      <span className="text-sm text-slate-600">Thinking...</span>
                    </div>
                  </div>
                )}

                {/* Suggested Questions — shown only before any user message */}
                {messages.filter((m) => m.type === 'user').length === 0 && !isSending && (
                  <div className="mt-8">
                    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold">?</span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800">Popular Questions</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {suggestedQuestions.slice(0, 8).map((question, index) => (
                          <button
                            key={index}
                            onClick={() => setMessage(question)}
                            className="group text-left bg-white hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 border-2 border-slate-200 hover:border-indigo-300 px-5 py-4 rounded-xl transition-all shadow-sm hover:shadow-md"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">
                                {index + 1}
                              </span>
                              <span className="text-slate-700 group-hover:text-indigo-700 font-medium">
                                {question}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t-2 border-slate-200 p-6 bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="max-w-5xl mx-auto">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Send a message (Shift+Enter for new line)"
                      disabled={isSending}
                      className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-xl px-5 py-4 text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 resize-none shadow-sm transition-all disabled:opacity-60"
                      rows={1}
                      style={{ minHeight: '56px', maxHeight: '150px' }}
                    />
                  </div>
                  <button
                    onClick={() => void handleSend()}
                    disabled={!message.trim() || isSending}
                    className="flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white px-6 py-4 rounded-xl transition-all shadow-md hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 active:scale-95"
                  >
                    {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-pulse" />
                  <p className="text-sm text-slate-600 font-medium">
                    AI-powered assistance for performance analysis and testing optimization
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
