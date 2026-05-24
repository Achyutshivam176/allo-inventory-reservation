import { NextResponse } from 'next/server';
import { cleanupExpiredReservations } from '@/lib/cleanup';

export async function POST() {
  const count = await cleanupExpiredReservations();
  return NextResponse.json({ released: count });
}
