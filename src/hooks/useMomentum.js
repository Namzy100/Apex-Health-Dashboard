/**
 * useMomentum — memoised momentum computation hook.
 * Re-runs only when the store reference changes.
 */
import { useMemo } from 'react';
import { useApexStore, saveMomentumScore } from '../store/apexStore';
import { computeMomentum } from '../services/momentumEngine';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function useMomentum() {
  const [store, update] = useApexStore();

  const momentum = useMemo(() => computeMomentum(store), [store]);

  // Persist today's score whenever it's computed (debounced by store re-renders)
  // We write directly so it doesn't trigger an infinite loop via useEffect
  const today = todayStr();
  const stored = store.momentumLog?.[today];
  if (!stored || Math.abs((stored.score || 0) - momentum.score) >= 5) {
    // Only write if value changed meaningfully to avoid re-render loop
    try {
      saveMomentumScore(today, { score: momentum.score, breakdown: momentum.breakdown });
    } catch { /* noop */ }
  }

  return { momentum, update };
}
