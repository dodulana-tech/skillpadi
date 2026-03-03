import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Community from '@/models/Community';
import Invite from '@/models/Invite';
import { sendTextMessage } from '@/lib/whatsapp';
import { PLATFORM } from '@/lib/constants';

function generateCode(prefix = 'ESTATE') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${code}`;
}

export const POST = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await parseBody(request);
  if (!body?.action) return error('action required', 400);

  await dbConnect();
  const community = await Community.findById(id);
  if (!community) return error('Community not found', 404);

  if (body.action === 'approve') {
    community.status = 'approved';
    community.approvedDate = new Date();
    community.approvedBy = auth.dbUser._id;
    community.isActive = true;
    await community.save();

    // Generate invite code
    let code = generateCode('ESTATE');
    let attempts = 0;
    while (await Invite.findOne({ code }).lean() && attempts++ < 10) {
      code = generateCode('ESTATE');
    }
    await Invite.create({
      code,
      type: 'community',
      entityId: community._id,
      entityName: community.name,
      discount: 0,
      maxUses: 0,
      isActive: true,
    });

    // WhatsApp the community contact
    if (community.phone) {
      sendTextMessage(community.phone,
        `✅ *${community.name} is now on SkillPadi!*\n\n` +
        `Your application has been approved. Here's your estate invite code:\n\n` +
        `*${code}*\n\n` +
        `Share this with residents so they can sign up and access SkillPadi programmes at your estate.\n\n` +
        `School portal: ${PLATFORM.url}/dashboard/community\n` +
        `Resident sign-up: ${PLATFORM.url}/auth/signup?invite=${code}\n\n` +
        `Questions? Reply to this message.`
      );
    }

    return success({ ok: true, inviteCode: code });
  }

  if (body.action === 'reject') {
    community.status = 'rejected';
    community.rejectedDate = new Date();
    community.rejectionReason = body.reason || undefined;
    await community.save();

    if (community.phone && body.reason) {
      sendTextMessage(community.phone,
        `Hi ${community.contactName || 'there'}, thank you for applying to partner with SkillPadi.\n\n` +
        `Unfortunately we are unable to approve *${community.name}* at this time.\n\n` +
        `Reason: ${body.reason}\n\n` +
        `Please reach out if you have any questions.`
      );
    }
    return success({ ok: true });
  }

  return error('Invalid action', 400);
});
