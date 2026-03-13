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

    const { enrollmentId, message, milestone, notify, note } = await req.json();
    if (!enrollmentId) return NextResponse.json({ error: 'enrollmentId required' }, { status: 400 });

    const enrollment = await Enrollment.findById(enrollmentId).populate('programId', 'name sessions');
    if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

    // Increment session
    enrollment.sessionsCompleted = (enrollment.sessionsCompleted || 0) + 1;
    if (milestone && typeof milestone === 'string' && !enrollment.milestonesCompleted.includes(milestone)) {
      enrollment.milestonesCompleted.push(milestone.slice(0, 200));
    }
    if (note && typeof note === 'string') {
      const safeNote = note.slice(0, 500);
      enrollment.notes = enrollment.notes ? `${enrollment.notes}\n${safeNote}` : safeNote;
    }

    // Auto-complete if all sessions done
    if (enrollment.sessionsCompleted >= (enrollment.programId?.sessions || 999)) {
      enrollment.status = 'completed';
    }

    await enrollment.save();

    // Send WhatsApp if requested
    if (notify) {
      const parent = await User.findById(enrollment.userId, 'phone name');
      if (parent?.phone) {
        const prog = enrollment.programId;
        let msg = `✅ *SkillPadi Session Update*\n${enrollment.childName} completed session ${enrollment.sessionsCompleted}/${prog?.sessions || '?'} of *${prog?.name || 'Programme'}*!`;
        if (milestone) msg += `\n🏅 Milestone: ${milestone}`;
        if (note) msg += `\nCoach notes: ${note}`;
        msg += `\nView progress: ${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/dashboard/parent`;
        sendTextMessage(parent.phone, msg);
      }
    }

    return NextResponse.json({
      success: true,
      sessionsCompleted: enrollment.sessionsCompleted,
      status: enrollment.status,
    });
  } catch (err) {
    console.error('Session update error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
