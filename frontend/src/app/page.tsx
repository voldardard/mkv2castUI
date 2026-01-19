import { redirect } from 'next/navigation';

// Redirect root to default language
export default function RootPage() {
  redirect('/en');
}
