import { NextResponse } from 'next/server';
import { isDbConnected } from '@/lib/db';
import dbConnect from '@/lib/db';

// GET /api/health — Public health check
export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({
      status: 'ok',
      db: isDbConnected() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'disconnected' },
      { status: 503 },
    );
  }
}
