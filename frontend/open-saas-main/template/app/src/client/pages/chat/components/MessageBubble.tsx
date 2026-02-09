import { memo } from "react";
import ReactMarkdown from "react-markdown";
import { Badge } from "../../../components/ui/badge";
import { User, Bot, ShieldAlert } from "lucide-react";
import { cn } from "../../../utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  piiRedacted?: boolean;
  isStreaming?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  model,
  piiRedacted,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-blue-600" : "bg-zinc-700"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Contenido */}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-100"
        )}
      >
        {piiRedacted && (
          <Badge
            variant="outline"
            className="mb-1.5 border-amber-500/50 text-amber-400 text-[10px] gap-1"
          >
            <ShieldAlert className="h-3 w-3" />
            PII Redacted
          </Badge>
        )}

        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="text-sm prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;
                  return isInline ? (
                    <code
                      className="bg-zinc-700 px-1.5 py-0.5 rounded text-xs font-mono text-blue-300"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 overflow-x-auto my-2">
                      <code
                        className={cn("text-xs font-mono", className)}
                        {...props}
                      >
                        {children}
                      </code>
                    </pre>
                  );
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5" />
            )}
          </div>
        )}

        {model && !isUser && (
          <p className="text-[10px] text-zinc-500 mt-1.5 font-mono">{model}</p>
        )}
      </div>
    </div>
  );
});
