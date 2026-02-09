import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "wasp/client/operations";
import {
  getConversations,
  getMessages,
  createConversation,
  saveMessage,
  deleteConversation,
} from "wasp/client/operations";
import { MessageBubble } from "./components/MessageBubble";
import { ChatInput } from "./components/ChatInput";
import { ChatSidebar } from "./components/ChatSidebar";
import { ModelSelector } from "./components/ModelSelector";
import { ApiKeyPrompt } from "./components/ApiKeyPrompt";
import { Shield, PanelLeftClose, PanelLeft } from "lucide-react";

const AI_GW_URL = (import.meta as any).env?.VITE_AI_GATEWAY_URL || "/ai";
const API_KEY_STORAGE = "securetag_chat_api_key";

interface ChatMsg {
  id?: string;
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  piiRedacted?: boolean;
  isStreaming?: boolean;
}

export default function ChatPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(conversationId || null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Queries
  const { data: conversations, refetch: refetchConversations } = useQuery(
    getConversations
  );
  const { data: savedMessages } = useQuery(getMessages, {
    conversationId: activeConversationId || "",
    enabled: !!activeConversationId,
  } as any);

  // Cargar API key de localStorage
  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE);
    if (stored) {
      setApiKey(stored);
    } else {
      setShowApiKeyPrompt(true);
    }
  }, []);

  // Sincronizar conversationId de URL
  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId);
    }
  }, [conversationId]);

  // Cargar mensajes guardados
  useEffect(() => {
    if (savedMessages && activeConversationId) {
      setMessages(
        savedMessages.map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          model: m.model,
          piiRedacted: m.piiRedacted,
        }))
      );
    }
  }, [savedMessages, activeConversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup abort controller al desmontar
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem(API_KEY_STORAGE, key);
    setApiKey(key);
    setShowApiKeyPrompt(false);
  };

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    navigate("/chat");
  }, [navigate]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation({ id });
        refetchConversations();
        if (activeConversationId === id) {
          handleNewChat();
        }
      } catch (err) {
        console.error("Error deleting conversation:", err);
      }
    },
    [activeConversationId, handleNewChat, refetchConversations]
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming || !apiKey) return;

    const userMessage = input.trim();
    setInput("");

    // Crear conversacion si no existe
    let convId = activeConversationId;
    if (!convId) {
      try {
        const conv = await createConversation({ model });
        convId = conv.id;
        setActiveConversationId(convId);
        navigate(`/chat/${convId}`, { replace: true });
        refetchConversations();
      } catch (err) {
        console.error("Error creating conversation:", err);
        return;
      }
    }

    // Agregar mensaje del usuario a UI
    const userMsg: ChatMsg = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, userMsg]);

    // Guardar mensaje del usuario en DB
    try {
      await saveMessage({
        conversationId: convId,
        role: "user",
        content: userMessage,
      });
    } catch (err) {
      console.error("Error saving user message:", err);
    }

    // Agregar placeholder del asistente
    const assistantMsg: ChatMsg = {
      role: "assistant",
      content: "",
      model,
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsStreaming(true);

    // Preparar historial para el LLM
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Streaming SSE
    const controller = new AbortController();
    abortRef.current = controller;

    let fullContent = "";
    let piiRedacted = false;
    let completionTokens: number | undefined;

    try {
      const response = await fetch(`${AI_GW_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          model,
          messages: history,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.detail?.error || errData.detail || `Error ${response.status}`;
        throw new Error(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(data);

            // Error en stream
            if (parsed.error) {
              throw new Error(parsed.error.message || "Stream error");
            }

            // Token usage
            if (parsed.usage) {
              completionTokens = parsed.usage.completion_tokens;
            }

            // Delta content
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: fullContent,
                  };
                }
                return updated;
              });
            }
          } catch (parseErr: any) {
            if (parseErr.message?.includes("Stream error")) throw parseErr;
            console.warn("SSE parse warning:", data);
          }
        }
      }

      // Detectar si hubo redaccion PII
      if (fullContent.includes("<") && (
        fullContent.includes("<EMAIL_ADDRESS>") ||
        fullContent.includes("<PERSON>") ||
        fullContent.includes("<PHONE_NUMBER>") ||
        fullContent.includes("<CREDIT_CARD>") ||
        fullContent.includes("<SECRET_DETECTED>")
      )) {
        piiRedacted = true;
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Cancelado por el usuario
      } else {
        fullContent = fullContent || `Error: ${err.message}`;
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;

      // Actualizar el ultimo mensaje
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: fullContent || "Sin respuesta",
            isStreaming: false,
            piiRedacted,
          };
        }
        return updated;
      });

      // Guardar respuesta del asistente en DB
      if (convId && fullContent) {
        try {
          await saveMessage({
            conversationId: convId,
            role: "assistant",
            content: fullContent,
            model,
            completionTokens,
            piiRedacted,
          });
          refetchConversations();
        } catch (err) {
          console.error("Error saving assistant message:", err);
        }
      }
    }
  }, [
    input,
    isStreaming,
    apiKey,
    activeConversationId,
    model,
    messages,
    navigate,
    refetchConversations,
  ]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* API Key Prompt */}
      <ApiKeyPrompt open={showApiKeyPrompt} onSave={handleSaveApiKey} />

      {/* Sidebar de conversaciones */}
      {sidebarOpen && (
        <div className="w-64 border-r border-zinc-800 bg-zinc-950 flex-shrink-0 hidden md:block">
          <ChatSidebar
            conversations={conversations || []}
            activeId={activeConversationId || undefined}
            onNew={handleNewChat}
            onDelete={handleDeleteConversation}
          />
        </div>
      )}

      {/* Area principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors hidden md:block"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>

          <Shield className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-mono text-zinc-400 tracking-wider">
            AI SHIELD
          </span>

          <div className="flex-1" />

          <ModelSelector
            value={model}
            onChange={setModel}
            disabled={isStreaming}
          />

          {apiKey && (
            <button
              onClick={() => {
                localStorage.removeItem(API_KEY_STORAGE);
                setApiKey(null);
                setShowApiKeyPrompt(true);
              }}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors font-mono"
            >
              Cambiar key
            </button>
          )}
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Shield className="h-12 w-12 text-blue-500/30 mb-4" />
              <h2 className="text-lg font-medium text-white mb-1">
                AI Shield Chat
              </h2>
              <p className="text-sm text-zinc-500 max-w-md">
                Chatea con modelos de IA de forma segura. Tus datos son
                escaneados por PII, secrets e injection antes de enviarse.
              </p>
              <div className="flex gap-2 mt-4">
                {["Explica qué es OWASP Top 10", "Revisa este código por vulnerabilidades", "¿Cómo implemento autenticación JWT?"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-1">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id || `msg-${i}`}
                  role={msg.role}
                  content={msg.content}
                  model={msg.role === "assistant" ? msg.model : undefined}
                  piiRedacted={msg.piiRedacted}
                  isStreaming={msg.isStreaming}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          isStreaming={isStreaming}
          disabled={!apiKey}
        />
      </div>
    </div>
  );
}
