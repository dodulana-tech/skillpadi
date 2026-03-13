import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import { sendTextMessage } from '@/lib/whatsapp';

export async function POST(req) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (isAuthError(auth)) return auth;

    await dbConnect();

    const { enrollmentIds } = await req.json();
    if (!Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
      return NextResponse.json({ error: 'enrollmentIds required' }, { status: 400 });
    }
    if (enrollmentIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 enrollments per batch' }, { status: 400 });
    }

    let updated = 0;
    let notified = 0;

    for (const id of enrollmentIds) {
      if (typeof id !== 'string') continue;
      const enrollment = await Enrollment.findById(id).populate('programId', 'name sessions');
      if (!enrollment || enrollment.status !== 'active') continue;

      enrollment.sessionsCompleted = (enrollment.sessionsCompleted || 0) + 1;
      if (enrollment.sessionsCompleted >= (enrollment.programId?.sessions || 999)) {
        enrollment.status = 'completed';
      }
      await enrollment.save();
      updated++;

      const parent = await User.findById(enrollment.userId, 'phone');
      if (parent?.phone) {
        const prog = enrollment.programId;
        const msg = `✅ *SkillPadi Session Update*\n${enrollment.childName} completed session ${enrollment.sessionsCompleted}/${prog?.sessions || '?'} of *${prog?.name || 'Programme'}*!\nView progress: ${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/dashboard/parent`;
        sendTextMessage(parent.phone, msg);
        notified++;
      }
    }

    return NextResponse.json({ success: true, updated, notified });
  } catch (err) {
    console.error('Bulk session error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
