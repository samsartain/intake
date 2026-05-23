import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import IntakeApp from '@/components/IntakeApp';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const meta = (user.user_metadata ?? {}) as Record<string, any>;
  const fullName: string = meta.full_name || meta.name || meta.given_name || '';
  const firstName = fullName.trim().split(/\s+/)[0] || '';

  return <IntakeApp userEmail={user.email || ''} userName={firstName} />;
}
