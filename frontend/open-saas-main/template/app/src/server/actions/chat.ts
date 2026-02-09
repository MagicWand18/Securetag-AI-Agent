import { HttpError } from "wasp/server";

const VALID_ROLES = ["user", "assistant"] as const;
const MAX_MESSAGE_LENGTH = 100_000;

type CreateConversationArgs = {
  model?: string;
};

type SaveMessageArgs = {
  conversationId: string;
  role: string;
  content: string;
  model?: string;
  completionTokens?: number;
  piiRedacted?: boolean;
};

type DeleteConversationArgs = {
  id: string;
};

type GetMessagesArgs = {
  conversationId: string;
};

export const getConversations = async (_args: void, context: any) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.ChatConversation.findMany({
    where: { userId: context.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      model: true,
      updatedAt: true,
      createdAt: true,
    },
  });
};

export const getMessages = async (args: GetMessagesArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  // Verificar ownership
  const conversation = await context.entities.ChatConversation.findUnique({
    where: { id: args.conversationId },
  });

  if (!conversation || conversation.userId !== context.user.id) {
    throw new HttpError(404, "Conversation not found");
  }

  return context.entities.ChatMessage.findMany({
    where: { conversationId: args.conversationId },
    orderBy: { createdAt: "asc" },
  });
};

export const createConversation = async (
  args: CreateConversationArgs,
  context: any
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.ChatConversation.create({
    data: {
      model: args.model || "gpt-4o-mini",
      user: { connect: { id: context.user.id } },
    },
  });
};

export const saveMessage = async (args: SaveMessageArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  // Verificar ownership
  const conversation = await context.entities.ChatConversation.findUnique({
    where: { id: args.conversationId },
  });

  if (!conversation || conversation.userId !== context.user.id) {
    throw new HttpError(404, "Conversation not found");
  }

  if (!VALID_ROLES.includes(args.role as any)) {
    throw new HttpError(400, `Invalid role: ${args.role}`);
  }
  if (args.content.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, "Message content too long");
  }
  if (!args.content.trim()) {
    throw new HttpError(400, "Message content cannot be empty");
  }

  const message = await context.entities.ChatMessage.create({
    data: {
      role: args.role,
      content: args.content,
      model: args.model,
      completionTokens: args.completionTokens,
      piiRedacted: args.piiRedacted || false,
      conversation: { connect: { id: args.conversationId } },
    },
  });

  // Auto-titulo: usar los primeros 50 caracteres del primer mensaje del usuario
  if (
    args.role === "user" &&
    conversation.title === "New conversation"
  ) {
    const title =
      args.content.length > 50
        ? args.content.substring(0, 50) + "..."
        : args.content;
    await context.entities.ChatConversation.update({
      where: { id: args.conversationId },
      data: { title },
    });
  }

  // Actualizar updatedAt de la conversacion
  await context.entities.ChatConversation.update({
    where: { id: args.conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
};

export const deleteConversation = async (
  args: DeleteConversationArgs,
  context: any
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const conversation = await context.entities.ChatConversation.findUnique({
    where: { id: args.id },
  });

  if (!conversation || conversation.userId !== context.user.id) {
    throw new HttpError(404, "Conversation not found");
  }

  // Cascade delete elimina los mensajes automaticamente
  return context.entities.ChatConversation.delete({
    where: { id: args.id },
  });
};
