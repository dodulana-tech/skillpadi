import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import School from '@/models/School';
import Invite from '@/models/Invite';
import { sendTextMessage } from '@/lib/whatsapp';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randStr = (n) =>
  Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

async function generateUniqueCode(entityName) {
  const prefix = entityName.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
  for (let i = 0; i < 5; i++) {
    const code = `${prefix}-${randStr(6)}`;
    const exists = await Invite.findOne({ code }).lean();
    if (!exists) return code;
  }
  return `SP-${randStr(8)}`;
}

// POST /api/schools/[id]/approve — Admin only
// action: 'approve' | 'reject'
export const POST = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await parseBody(request);
  const action = body?.action || 'approve';

  await dbConnect();
  const school = await School.findById(id);
  if (!school) return error('School not found', 404);

  if (action === 'reject') {
    school.status = 'rejected';
    school.rejectedDate = new Date();
    school.rejectionReason = body?.reason || undefined;
    await school.save();

    // Notify school contact
    if (school.phone) {
      (async () => {
        try {
          await sendTextMessage(school.phone,
            `Hi ${school.contactName || 'there'},\n\n` +
            `Thank you for applying to SkillPadi. After reviewing your application for *${school.name}*, ` +
            `we are unable to proceed at this time${body?.reason ? `: ${body.reason}` : ''}.\n\n` +
            `Please reach out if you have any questions.`
          );
        } catch (e) { /* non-blocking */ }
      })();
    }

    return success({ message: 'School application rejected', school: school.toObject() });
  }

  // Approve
  school.status = 'approved';
  school.approvedDate = new Date();
  school.approvedBy = auth.dbUser._id;
  school.isActive = true;
  await school.save();

  // Auto-generate invite code
  const code = await generateUniqueCode(school.name);
  const invite = await Invite.create({
    code,
    type: 'school',
    entityId: school._id,
    entityName: school.name,
    createdBy: auth.dbUser._id,
    maxUses: 0, // unlimited
    discount: 0,
    isActive: true,
  });

  // Notify school contact via WhatsApp
  if (school.phone) {
    (async () => {
      try {
        await sendTextMessage(school.phone,
          `🎉 *Congratulations, ${school.contactName || school.name}!*\n\n` +
          `Your school *${school.name}* has been approved on SkillPadi!\n\n` +
          `Your school invite code is:\n` +
          `*${code}*\n\n` +
          `Share this code with parents to enroll their children in programs at your school.\n\n` +
          `Sign in to your school dashboard at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/school\n\n` +
          `Welcome to the SkillPadi family! 🌟`
        );
      } catch (e) { /* non-blocking */ }
    })();
  }

  return success({
    message: 'School approved and invite code generated',
    school: school.toObject(),
    inviteCode: code,
    invite: invite.toObject(),
  });
});
