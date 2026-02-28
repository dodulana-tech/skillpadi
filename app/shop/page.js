import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import { Product, StarterKit } from '@/models/Shop';
import Navbar from '@/components/Navbar';
import { ShopClient } from './ShopClient';

export const metadata = {
  title: 'Shop — Starter Kits & Equipment',
  description: 'Swimwear, football boots, keyboards, coding workbooks and more. Starter kits save up to 20%. Order via WhatsApp.',
};

async function getData() {
  await dbConnect();
  const [categories, products, kits] = await Promise.all([
    Category.find({ active: true }).sort({ order: 1 }).lean(),
    Product.find({ inStock: true }).populate('categoryId', 'name slug icon color').sort({ order: 1 }).lean(),
    StarterKit.find({ inStock: true }).populate('categoryId', 'name slug icon color').sort({ name: 1 }).lean(),
  ]);
  return JSON.parse(JSON.stringify({ categories, products, kits }));
}

export default async function ShopPage() {
  const data = await getData();
  return (
    <main className="bg-cream min-h-screen">
      <Navbar />
      <ShopClient {...data} />
    </main>
  );
}
