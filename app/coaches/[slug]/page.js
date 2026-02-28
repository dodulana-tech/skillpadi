import dbConnect from '@/lib/db';
import Coach from '@/models/Coach';
import Program from '@/models/Program';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { CoachProfileClient } from './CoachProfileClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  await dbConnect();
  const coach = await Coach.findOne({ slug }).populate('categoryId', 'name icon').lean();
  if (!coach) return { title: 'Coach Not Found' };

  return {
    title: `${coach.name} — ${coach.title}`,
    description: `${coach.bio} Book ${coach.categoryId?.name} sessions for kids ages ${coach.ageGroups} in Abuja.`,
    openGraph: {
      title: `${coach.name} | SkillPadi`,
      description: `${coach.categoryId?.icon} ${coach.title}. ⭐ ${coach.rating}/5 · ${coach.yearsExperience} years experience.`,
    },
  };
}

// Allow dynamic params not returned by generateStaticParams
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    await dbConnect();
    const coaches = await Coach.find({ isActive: true }).select('slug').lean();
    return coaches.map((c) => ({ slug: c.slug }));
  } catch {
    // DB unavailable at build time — all pages will be SSR'd on first request
    return [];
  }
}

async function getCoachData(slug) {
  await dbConnect();
  const coach = await Coach.findOne({ slug, isActive: true }).populate('categoryId').lean();
  if (!coach) return null;

  const programs = await Program.find({ coachId: coach._id, isActive: true })
    .populate('categoryId', 'name slug icon color')
    .lean();

  return JSON.parse(JSON.stringify({ coach, programs }));
}

export default async function CoachPage({ params }) {
  const { slug } = await params;
  const data = await getCoachData(slug);

  if (!data) notFound();

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <CoachProfileClient coach={data.coach} programs={data.programs} />
    </main>
  );
}
