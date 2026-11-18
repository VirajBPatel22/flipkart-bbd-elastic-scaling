import { useEffect, useRef, useState } from 'react';
import { getHealth } from '../services/apiClient';





const POLL_INTERVAL_MS = 30000;

export function useApiHealth() {
  const [status, setStatus] = useState('checking');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    let timeoutId;

    async function check() {
      try {
        await getHealth();
        if (isMountedRef.current) setStatus('online');
      } catch {
        if (isMountedRef.current) setStatus('offline');
      } finally {
        if (isMountedRef.current) {
          timeoutId = setTimeout(check, POLL_INTERVAL_MS);
        }
      }
    }

    check();

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return status;
}
