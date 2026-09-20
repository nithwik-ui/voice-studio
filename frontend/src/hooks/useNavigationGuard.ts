import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useNavigationGuard(isDirty: boolean, message: string = "You have unsaved changes. Are you sure you want to leave?") {
  const router = useRouter();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);

  // Note: App Router doesn't have native router.events for blocking client-side navigation.
  // A full solution would require overriding the next/link and next/router methods,
  // but standard window.beforeunload catches window closes/refreshes.
}
