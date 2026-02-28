import dbConnect from '@/lib/db';
import Program from '@/models/Program';
import Coach from '@/models/Coach';
import Navbar from '@/components/Navbar';
import { ProgramDetailClient } from './ProgramDetailClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
  const { id } = await params;
  await dbConnect();
  const program = await Program.findOne(
    id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id },
  ).populate('categoryId', 'name icon').lean();

  if (!program) return { title: 'Program Not Found' };
  return {
    title: `${program.name} — ${program.categoryId?.name} for Ages ${program.ageRange}`,
    description: `${program.name} in ${program.location}. ${program.sessions} sessions at ₦${program.pricePerSession?.toLocaleString()}/session. Ages ${program.ageRange}.`,
  };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    await dbConnect();
    const programs = await Program.find({ isActive: true }).select('slug').lean();
    return programs.map((p) => ({ id: p.slug }));
  } catch {
    return [];
  }
}

async function getProgramData(id) {
  await dbConnect();
  const program = await Program.findOne(
    id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id },
  )
    .populate('categoryId')
    .populate('coachId', 'name slug initials shieldLevel rating reviewCount whatsapp bio yearsExperience ageGroups categoryId')
    .lean();

  if (!program) return null;
  return JSON.parse(JSON.stringify(program));
}

export default async function ProgramPage({ params }) {
  const { id } = await params;
  const program = await getProgramData(id);
  if (!program) notFound();

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <ProgramDetailClient program={program} />
    </main>
  );
}
