const REC_BASE = '/recommendation-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatRequest {
  app_id: string;
  question: string;
  session_id?: string;
}

export interface ChatResponse {
  answer: string;
  mode: string;
  session_id: string | null;
  sources: string[];
}

export interface ChatSessionSummary {
  id: string;
  application_id: string;
  title: string;
  preview: string;
  timestamp: string | null;
  mode: string;
  status: string;
}

export interface ChatMessageItem {
  id: string;
  type: string;
  content: string;
  details: string | null;
  timestamp: string | null;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

async function checkResponse(res: Response): Promise<void> {
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch {
      // ignore
    }
    throw new Error(detail ?? `Request failed (${res.status})`);
  }
}

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${REC_BASE}/chatbot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  await checkResponse(res);
  return res.json() as Promise<ChatResponse>;
}

export async function fetchChatSessions(appId: string): Promise<ChatSessionSummary[]> {
  const res = await fetch(`${REC_BASE}/chat/sessions/${appId}`);
  await checkResponse(res);
  const data = await res.json() as { sessions: ChatSessionSummary[] };
  return data.sessions;
}

export async function fetchChatMessages(sessionId: string): Promise<ChatMessageItem[]> {
  const res = await fetch(`${REC_BASE}/chat/messages/${sessionId}`);
  await checkResponse(res);
  const data = await res.json() as { messages: ChatMessageItem[] };
  return data.messages;
}
