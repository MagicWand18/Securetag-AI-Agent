import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquarePlus, Trash2, MessageSquare } from "lucide-react";
import { cn } from "../../../utils";

interface Conversation {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export const ChatSidebar = memo(function ChatSidebar({
  conversations,
  activeId,
  onNew,
  onDelete,
}: ChatSidebarProps) {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "ahora";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("es-MX", { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Boton nuevo chat */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-sm"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Nuevo chat
        </button>
      </div>

      {/* Lista de conversaciones */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="text-zinc-500 text-xs px-3 py-4 text-center">
            Sin conversaciones
          </p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                activeId === conv.id
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
              onClick={() => navigate(`/chat/${conv.id}`)}
            >
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="flex-1 truncate">{conv.title}</span>
              <span className="text-[10px] text-zinc-600 flex-shrink-0">
                {formatDate(conv.updatedAt)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
