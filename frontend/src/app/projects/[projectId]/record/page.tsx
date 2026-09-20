"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RecordRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.projectId) {
      router.replace(`/user/workspace/${params.projectId}`);
    }
  }, [params, router]);

  return (
    <div className="p-16 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="font-body-md text-on-surface-variant mt-4">Opening Recording Workspace...</p>
    </div>
  );
}
