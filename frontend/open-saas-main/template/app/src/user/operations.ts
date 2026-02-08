import { type Prisma } from "@prisma/client";
import { type User } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import {
  type GetPaginatedUsers,
  type UpdateIsUserAdminById,
} from "wasp/server/operations";
import * as z from "zod";
import { SubscriptionStatus } from "../payment/plans";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const updateUserAdminByIdInputSchema = z.object({
  id: z.string().nonempty(),
  isAdmin: z.boolean(),
});

type UpdateUserAdminByIdInput = z.infer<typeof updateUserAdminByIdInputSchema>;

export const updateIsUserAdminById: UpdateIsUserAdminById<
  UpdateUserAdminByIdInput,
  User
> = async (rawArgs, context) => {
  const { id, isAdmin } = ensureArgsSchemaOrThrowHttpError(
    updateUserAdminByIdInputSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  if (!context.user.isAdmin) {
    throw new HttpError(
      403,
      "Only admins are allowed to perform this operation",
    );
  }

  return context.entities.User.update({
    where: { id },
    data: { isAdmin },
  });
};

export const updateApiKey = async (
  { apiKey }: { apiKey: string },
  context: any
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.User.update({
    where: { id: context.user.id },
    data: { securetagApiKey: apiKey },
  });
};

type GetPaginatedUsersOutput = {
  users: Pick<
    User,
    | "id"
    | "email"
    | "username"
    | "subscriptionStatus"
    | "paymentProcessorUserId"
    | "isAdmin"
  >[];
  totalPages: number;
};

const getPaginatorArgsSchema = z.object({
  skipPages: z.number(),
  filter: z.object({
    emailContains: z.string().nonempty().optional(),
    isAdmin: z.boolean().optional(),
    subscriptionStatusIn: z
      .array(z.nativeEnum(SubscriptionStatus).nullable())
      .optional(),
  }),
});

type GetPaginatedUsersInput = z.infer<typeof getPaginatorArgsSchema>;

export const getPaginatedUsers: GetPaginatedUsers<
  GetPaginatedUsersInput,
  GetPaginatedUsersOutput
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  if (!context.user.isAdmin) {
    throw new HttpError(
      403,
      "Only admins are allowed to perform this operation",
    );
  }

  const {
    skipPages,
    filter: {
      subscriptionStatusIn: subscriptionStatus,
      emailContains,
      isAdmin,
    },
  } = ensureArgsSchemaOrThrowHttpError(getPaginatorArgsSchema, rawArgs);

  const includeUnsubscribedUsers = !!subscriptionStatus?.some(
    (status) => status === null,
  );
  const desiredSubscriptionStatuses = subscriptionStatus?.filter(
    (status) => status !== null,
  );

  const pageSize = 10;

  const userPageQuery: Prisma.UserFindManyArgs = {
    skip: skipPages * pageSize,
    take: pageSize,
    where: {
      AND: [
        {
          email: {
            contains: emailContains,
            mode: "insensitive",
          },
          isAdmin,
        },
        {
          OR: [
            {
              subscriptionStatus: {
                in: desiredSubscriptionStatuses,
              },
            },
            {
              subscriptionStatus: includeUnsubscribedUsers
                ? SubscriptionStatus.NONE
                : undefined,
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
      subscriptionStatus: true,
      paymentProcessorUserId: true,
    },
    orderBy: {
      username: "asc",
    },
  };

  const [pageOfUsers, totalUsers] = await prisma.$transaction([
    context.entities.User.findMany(userPageQuery),
    context.entities.User.count({ where: userPageQuery.where }),
  ]);
  const totalPages = Math.ceil(totalUsers / pageSize);

  return {
    users: pageOfUsers,
    totalPages,
  };
};

export const deleteAccount = async (_args: unknown, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Debes estar autenticado para realizar esta acción');
  }

  const user = context.user;
  console.log(`🗑️ [DeleteAccount] Iniciando borrado de cuenta para: ${user.email} (Tenant: ${user.securetagTenantId})`);

  // 1. Borrar Tenant en SecureTag Core (Si existe)
  if (user.securetagTenantId) {
    const backendUrl = process.env.SECURETAG_API_URL || 'http://securetag-app:8080';
    const systemSecret = process.env.SECURETAG_SYSTEM_SECRET;

    try {
      // Nota: Este endpoint requiere privilegios de sistema o ser el owner
      const response = await fetch(`${backendUrl}/api/v1/tenants/${user.securetagTenantId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(systemSecret ? { 'X-SecureTag-System-Secret': systemSecret } : {}),
          // Core requiere el ID del usuario para auditoría o validación incluso en llamadas de sistema
          'X-SecureTag-User-Id': user.securetagUserId || user.id
        }
      });

      if (!response.ok) {
        // Tolerancia a 404 (Ya borrado)
        if (response.status === 404) {
             console.warn('⚠️ [DeleteAccount] Tenant no encontrado en Core (404). Asumiendo ya borrado.');
        } else {
            const errorText = await response.text();
            console.error(`❌ [DeleteAccount] Falló borrado en Core: ${response.status} - ${errorText}`);
            throw new HttpError(500, 'No se pudo eliminar los datos del núcleo de seguridad. Contacte soporte.');
        }
      } else {
         console.log('✅ [DeleteAccount] Tenant eliminado en Core.');
      }
    } catch (error: any) {
      console.error('❌ [DeleteAccount] Error de conexión con Core:', error);
      if (error instanceof HttpError) throw error;
      // Si es un error de red y no hemos podido verificar el estado, quizás deberíamos fallar.
      // Pero para la prueba actual, dejemos que falle si no es 404.
      throw new HttpError(503, 'Error de comunicación con el sistema de seguridad.');
    }
  } else {
    console.warn('⚠️ [DeleteAccount] Usuario sin Tenant ID, saltando limpieza de Core.');
  }

  // 2. Borrar Usuario en Wasp (Hard Delete por ahora, según plan)
  try {
    await context.entities.User.delete({
      where: { id: user.id }
    });
    console.log('✅ [DeleteAccount] Usuario eliminado de OpenSaaS DB.');
  } catch (error) {
    console.error('❌ [DeleteAccount] Falló borrado local:', error);
    throw new HttpError(500, 'Error interno al eliminar la cuenta.');
  }

  return { success: true };
};
