import { buildApiUrl } from '@/app/api';

export interface ChatbotResponse {
  answer: string;
  mode: "advisory" | "diagnostic";
  session_id?: string;
  sources?: string[];
}

export interface ChatSessionSummary {
  id: string;
  application_id: string;
  title: string;
  preview: string;
  timestamp?: string;
  mode: "advisory" | "diagnostic" | string;
  status: string;
}

export interface ChatMessageItem {
  id: string;
  type: "bot" | "user";
  content: string;
  details?: string;
  timestamp?: string;
}

export async function sendChatMessage(
  appId: string,
  question: string,
  sessionId?: string
): Promise<ChatbotResponse> {
  const response = await fetch(buildApiUrl('/api/v1/chatbot'), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId || "1",
      question,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Chatbot backend error:", errorText);
    throw new Error(`Chatbot API failed with status ${response.status}`);
  }

  return response.json();
}

export async function getChatSessions(appId: string): Promise<{ sessions: ChatSessionSummary[] }> {
  const response = await fetch(buildApiUrl(`/api/v1/chat/sessions/${appId}`));

  if (!response.ok) {
    throw new Error("Failed to load sessions");
  }

  return response.json();
}

export async function getChatMessages(sessionId: string): Promise<{ messages: ChatMessageItem[] }> {
  const response = await fetch(buildApiUrl(`/api/v1/chat/messages/${sessionId}`));

  if (!response.ok) {
    throw new Error("Failed to load messages");
  }

  return response.json();
}