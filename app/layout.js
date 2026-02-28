import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata = {
  title: {
    default: 'SkillPadi — Kids Skills Development in Abuja',
    template: '%s | SkillPadi',
  },
  description: 'Swimming, Football, Taekwondo, Piano, Tennis, Coding — vetted coaches at trusted Abuja venues. Structured skills development for kids ages 3-16.',
  keywords: ['kids activities Abuja', 'swimming lessons Abuja', 'football coaching Abuja', 'taekwondo kids Abuja', 'piano lessons Abuja', 'coding for kids Abuja'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'),
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    siteName: 'SkillPadi',
    title: 'SkillPadi — Give Your Child Skills That Last a Lifetime',
    description: 'Vetted coaches. Trusted venues. Real progress tracking.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
