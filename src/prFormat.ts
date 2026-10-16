import { clock, num, volume, weight } from './lib/format';
import type { PRKind } from './lib/stats';
import type { WeightUnit } from './lib/types';

export function formatPRValue(kind: PRKind, value: number, unit: WeightUnit): string {
  switch (kind) {
    case 'mostReps':
      return `${num(value, 0)} reps`;
    case 'longest':
      return clock(value);
    case 'bestSetVolume':
    case 'bestSessionVolume':
      return volume(value, unit);
    default:
      return weight(value, unit);
  }
}
