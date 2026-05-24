import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export async function getIdempotentResponse(
  route: string,
  key?: string | null
) {
  if (!key) return null;

  const record = await prisma.idempotencyKey.findUnique({
    where: { key },
  });

  if (!record || record.route !== route) return null;

  return {
    statusCode: record.statusCode,
    body: record.responseBody,
  };
}

export async function storeIdempotentResponse(
  route: string,
  key: string,
  statusCode: number,
  body: unknown
) {
  const responseBody =
    body === null || body === undefined
      ? Prisma.JsonNull
      : (body as Prisma.InputJsonValue);

  await prisma.idempotencyKey.upsert({
    where: { key },

    update: {
      route,
      statusCode,
      responseBody,
    },

    create: {
      key,
      route,
      statusCode,
      responseBody,
    },
  });
}