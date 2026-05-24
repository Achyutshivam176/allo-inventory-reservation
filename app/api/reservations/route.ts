export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cleanupExpiredReservations } from '@/lib/cleanup';
import { getIdempotentResponse, storeIdempotentResponse } from '@/lib/idempotency';

const CreateReservationSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  expiresInMinutes: z.number().int().positive().max(60).optional().default(10),
});

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get('Idempotency-Key');
  const cached = await getIdempotentResponse('/api/reservations', idempotencyKey);
  if (cached) return NextResponse.json(cached.body, { status: cached.statusCode });

  const body = await req.json();
  const parsed = CreateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await cleanupExpiredReservations();

  const { productId, warehouseId, quantity, expiresInMinutes } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; totalUnits: number; reservedUnits: number }>>`
        SELECT id, "totalUnits", "reservedUnits"
        FROM "Inventory"
        WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      const inventory = rows[0];
      if (!inventory) {
        return { status: 404 as const, body: { error: 'Inventory not found' } };
      }

      const available = inventory.totalUnits - inventory.reservedUnits;
      if (available < quantity) {
        return { status: 409 as const, body: { error: 'Not enough stock available' } };
      }

      await tx.inventory.update({
        where: { id: inventory.id },
        data: { reservedUnits: { increment: quantity } },
      });

      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: ReservationStatus.pending,
          expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
        },
        include: {
          product: true,
          warehouse: true,
        },
      });

      return { status: 201 as const, body: { reservation } };
    });

    if (idempotencyKey) {
      await storeIdempotentResponse('/api/reservations', idempotencyKey, result.status, result.body);
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return NextResponse.json({ error: 'Reservation failed' }, { status: 500 });
  }
}
