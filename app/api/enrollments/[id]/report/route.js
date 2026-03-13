import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole, authenticate, isAuthError } from '@/lib/auth';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import { sendTextMessage } from '@/lib/whatsapp';

export async function PUT(req, { params }) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (isAuthError(auth)) return auth;

    await dbConnect();
    const { id } = await params;

    const body = await req.json();
    const { overallRating, attendance, skillMarkers, strengths, improvements, coachNotes, recommendation, recommendedProgramId, certificateEarned, publish } = body;

    // Validate rating
    if (overallRating !== undefined && (overallRating < 1 || overallRating > 5)) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }
    const validRecs = ['repeat', 'advance', 'new-sport', 'private'];
    if (recommendation && !validRecs.includes(recommendation)) {
      return NextResponse.json({ error: 'Invalid recommendation' }, { status: 400 });
    }

    const enrollment = await Enrollment.findById(id).populate('programId', 'name');
    if (!enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    enrollment.termReport = {
      overallRating: Number(overallRating) || undefined,
      attendance: attendance ? { present: Number(attendance.present) || 0, total: Number(attendance.total) || 0 } : undefined,
      skillMarkers: Array.isArray(skillMarkers) ? skillMarkers.slice(0, 20) : [],
      strengths: Array.isArray(strengths) ? strengths.map(s => String(s).slice(0, 100)).slice(0, 10) : [],
      improvements: Array.isArray(improvements) ? improvements.map(s => String(s).slice(0, 100)).slice(0, 10) : [],
      coachNotes: typeof coachNotes === 'string' ? coachNotes.slice(0, 1000) : undefined,
      recommendation,
      recommendedProgramId: recommendedProgramId || undefined,
      certificateEarned: certificateEarned || false,
      published: publish || false,
      publishedAt: publish ? new Date() : undefined,
    };

    await enrollment.save();

    if (publish) {
      const parent = await User.findById(enrollment.userId, 'phone name');
      if (parent?.phone) {
        const stars = '⭐'.repeat(overallRating || 0);
        const msg = `📋 *SkillPadi Term Report*\n\n${enrollment.childName}'s report for *${enrollment.programId?.name || 'Programme'}* is ready!\n\n${stars}\nAttendance: ${attendance?.present || 0}/${attendance?.total || 0}\n${certificateEarned ? '🎓 Certificate earned!\n' : ''}\nView full report: ${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/dashboard/parent`;
        sendTextMessage(parent.phone, msg);
      }
    }

    return NextResponse.json({ success: true, termReport: enrollment.termReport });
  } catch (err) {
    console.error('Report error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req, { params }) {
  try {
    const auth = await authenticate(req);
    if (isAuthError(auth)) return auth;

    await dbConnect();
    const { id } = await params;

    const enrollment = await Enrollment.findById(id, 'termReport childName programId userId')
      .populate('programId', 'name categoryId');
    if (!enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Verify ownership: parent can only see their own, admin can see all
    if (auth.dbUser.role !== 'admin' && String(enrollment.userId) !== String(auth.dbUser._id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ termReport: enrollment.termReport });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
