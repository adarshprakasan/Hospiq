import { useCallback, useEffect, useRef, useState } from 'react';
import axios from '../api/axios';

// Private responses stay with their mounted consumer, never in a shared cache.
export default function usePolling(url, interval = 10000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const generation = useRef(0);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const lifetime = generation;
    const current = ++lifetime.current;
    let timer, controller;
    let failures = 0, requestSequence = 0;
    async function load() {
      clearTimeout(timer);
      if (document.hidden || !navigator.onLine) { timer = setTimeout(load, interval); return; }
      const sequence = ++requestSequence;
      controller?.abort(); controller = new AbortController();
      try {
        const result = await axios.get(url, { signal: controller.signal });
        if (current !== generation.current || sequence !== requestSequence) return;
        setData(result.data); setError(''); setUpdatedAt(new Date()); failures = 0;
      } catch (err) {
        if (current !== generation.current || sequence !== requestSequence || err.code === 'ERR_CANCELED') return;
        failures++; setError(err.response?.data?.message || 'Updates interrupted. Showing the last loaded information.');
      } finally {
        if (current === generation.current && sequence === requestSequence) { setLoading(false); timer = setTimeout(load, Math.min(interval * 2 ** failures, 60000)); }
      }
    }
    load();
    const resume = () => { if (!document.hidden) load(); };
    window.addEventListener('online', resume); document.addEventListener('visibilitychange', resume);
    return () => { lifetime.current++; clearTimeout(timer); controller?.abort(); window.removeEventListener('online', resume); document.removeEventListener('visibilitychange', resume); };
  }, [url, interval, revision]);
  return { data, setData, loading, error, updatedAt, refresh };
}
