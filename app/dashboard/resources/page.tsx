'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResourcesRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to dashboard with the tips tab active
    router.push('/dashboard?tab=tips');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex justify-center items-center">
      <div className="w-8 h-8 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
