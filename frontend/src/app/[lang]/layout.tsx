import { notFound } from 'next/navigation';

const locales = ['en', 'fr', 'de', 'es', 'it'];

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default function LangLayout({
  children,
  params: { lang },
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!locales.includes(lang)) {
    notFound();
  }

  return <>{children}</>;
}
