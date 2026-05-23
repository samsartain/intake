import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import IntakeApp from '@/components/IntakeApp';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <IntakeApp userEmail={user.email || ''} />;
}
