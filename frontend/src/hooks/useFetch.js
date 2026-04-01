import { useState, useEffect, useCallback } from 'react';
import api from '../api';

export default function useFetch(endpoint) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get(endpoint)
      .then(res  => { if (!cancelled) setData(res.data); })
      .catch(err => { if (!cancelled) setError(err.message ?? 'Failed to load data'); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick, endpoint]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { data, loading, error, refetch };
}
