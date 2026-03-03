import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import Tournament from '@/models/Tournament';
import TournamentDetailClient from './TournamentDetailClient';
import Navbar from '@/components/Navbar';

export async function generateMetadata({ params }) {
  const { id } = await params;
  await dbConnect();
  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
  const t = await Tournament.findOne(query, 'name description').lean();
  if (!t) return { title: 'Tournament | SkillPadi' };
  return {
    title: `${t.name} | SkillPadi Tournaments`,
    description: t.description || `Join ${t.name} on SkillPadi!`,
  };
}

export default async function TournamentDetailPage({ params }) {
  const { id } = await params;
  await dbConnect();

  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
  const tournament = await Tournament.findOne(query)
    .populate('categoryId', 'name slug icon color')
    .lean();

  if (!tournament) return notFound();

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <TournamentDetailClient tournament={JSON.parse(JSON.stringify(tournament))} />
    </main>
  );
}
