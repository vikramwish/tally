import Svg, { Path } from 'react-native-svg';
import { c } from '../theme';

const PATHS = {
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
  dumbbell: 'M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12',
  chart: 'M5 20V11M11 20V5M17 20v-6M2 20h20',
  gear: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12 5 5 9-10',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  right: 'm9 6 6 6-6 6',
  left: 'm15 6-6 6 6 6',
  down: 'm6 9 6 6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2 2M10 2h4',
  plates: 'M2 12h20M6 7v10M9 5v14M15 5v14M18 7v10',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 21 21',
  folder: 'M3 6h7l2 2h9v11H3z',
  share: 'M12 15V3M7 8l5-5 5 5M5 13v8h14v-8',
  link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  up: 'm6 15 6-6 6 6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  scale: 'M4 20h16V8H4zM9 12l3 3 3-5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, color = c.ink, strokeWidth = 1.5 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={PATHS[name]}
        stroke={color}
        strokeWidth={name === 'more' ? 3 : strokeWidth}
        strokeLinecap={name === 'more' ? 'round' : 'square'}
        strokeLinejoin="miter"
      />
    </Svg>
  );
}
