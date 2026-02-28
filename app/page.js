import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import Coach from '@/models/Coach';
import Program from '@/models/Program';
import Navbar from '@/components/Navbar';
import { LandingClient } from '@/components/landing/LandingClient';

async function getData() {
  await dbConnect();

  const [categories, coaches, programs] = await Promise.all([
    Category.find({ active: true }).sort({ order: 1 }).lean(),
    Coach.find({ isActive: true })
      .populate('categoryId', 'name slug icon color sponsor')
      .sort({ featuredOrder: 1, rating: -1 })
      .lean(),
    Program.find({ isActive: true })
      .populate('categoryId', 'name slug icon color sponsor')
      .populate('coachId', 'name slug initials shieldLevel rating whatsapp')
      .sort({ categoryId: 1, name: 1 })
      .lean(),
  ]);

  // Serialize — strip Mongoose ObjectIds/Dates for client
  return JSON.parse(JSON.stringify({ categories, coaches, programs }));
}

export default async function HomePage() {
  const data = await getData();

  return (
    <main className="bg-cream min-h-screen">
      <Navbar />
      <LandingClient
        categories={data.categories}
        coaches={data.coaches}
        programs={data.programs}
      />
    </main>
  );
}
