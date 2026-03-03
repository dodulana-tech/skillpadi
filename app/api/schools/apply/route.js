import { handler, success, error, parseBody } from '@/lib/api-utils';
import dbConnect from '@/lib/db';
import School from '@/models/School';
import Enquiry from '@/models/Enquiry';
import { sendTextMessage } from '@/lib/whatsapp';

// POST /api/schools/apply — Public, no auth required
// Creates a pending school application + admin enquiry
export const POST = handler(async (request) => {
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  const { schoolName, schoolType, area, address, estimatedStudents, website,
    contactName, contactRole, contactEmail, contactPhone,
    interestedCategories, initialStudents, facilities, notes } = body;

  if (!schoolName?.trim()) return error('School name is required', 400);
  if (!contactName?.trim()) return error('Contact name is required', 400);
  if (!contactEmail?.trim()) return error('Contact email is required', 400);
  if (!contactPhone?.trim()) return error('Contact phone is required', 400);

  await dbConnect();

  // Dedupe: check if school with same email already applied
  const existing = await School.findOne({ email: contactEmail.toLowerCase().trim() }).lean();
  if (existing) {
    if (existing.status === 'pending') {
      return error('A partnership request for this email is already under review. We will WhatsApp you within 24 hours.', 409);
    }
    if (existing.status === 'approved') {
      return error('This school is already registered on SkillPadi. Contact us if you need access.', 409);
    }
  }

  // Generate slug
  const base = schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let slug = base;
  let attempt = 0;
  while (await School.findOne({ slug }).lean()) {
    slug = `${base}-${++attempt}`;
  }

  const school = await School.create({
    name: schoolName.trim(),
    slug,
    schoolType: schoolType || undefined,
    area: area || undefined,
    address: address?.trim() || undefined,
    city: (area && ['lekki','ikoyi','vi','ajah','surulere','yaba','ikeja'].includes(area.toLowerCase())) ? 'lagos' : 'abuja',
    estimatedStudents: estimatedStudents ? Number(estimatedStudents) : undefined,
    website: website?.trim() || undefined,
    contactName: contactName.trim(),
    contactRole: contactRole?.trim() || undefined,
    email: contactEmail.toLowerCase().trim(),
    phone: contactPhone.trim(),
    facilities: Array.isArray(facilities) ? facilities : [],
    interestedCategories: Array.isArray(interestedCategories) ? interestedCategories : [],
    notes: notes?.trim() || undefined,
    status: 'pending',
    applicationDate: new Date(),
  });

  // Create enquiry so admin sees it in their pipeline
  await Enquiry.create({
    parentName: contactName.trim(),
    phone: contactPhone.trim(),
    email: contactEmail.toLowerCase().trim(),
    message: `School partnership enquiry: ${schoolName.trim()} (${schoolType || 'unknown type'}) in ${area || 'unknown area'}. Estimated ${estimatedStudents || '?'} students. ${notes || ''}`.trim(),
    source: 'school-partnership',
    status: 'new',
  });

  // Fire-and-forget WhatsApp to admin
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
  if (adminPhone) {
    (async () => {
      try {
        await sendTextMessage(adminPhone,
          `🏫 *New School Partnership*\n\n` +
          `*${schoolName.trim()}*\n` +
          `Type: ${schoolType || 'N/A'} · Area: ${area || 'N/A'}\n` +
          `Contact: ${contactName.trim()} (${contactRole || 'N/A'})\n` +
          `📱 ${contactPhone.trim()}\n` +
          `📧 ${contactEmail.toLowerCase().trim()}\n` +
          `Students: ~${estimatedStudents || '?'}\n\n` +
          `Activate in admin panel: /admin`
        );
      } catch (e) { /* non-blocking */ }
    })();
  }

  return success({ message: 'Partnership request received', schoolId: school._id }, 201);
});
