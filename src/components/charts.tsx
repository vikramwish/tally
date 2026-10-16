import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';

import { shortDate } from '../lib/format';
import { c, radius, type } from '../theme';
import { Label } from './ui';

/** Line chart of dated values. Last point is the ember marker. */
export function LineChart({
  points,
  height = 160,
  format,
  label,
}: {
  points: Array<{ date: number; value: number }>;
  height?: number;
  format: (v: number) => string;
  label: string;
}) {
  const [width, setWidth] = useState(0);
  if (points.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', backgroundColor: c.sunken, borderRadius: radius.lg }}>
        <Label>No data yet</Label>
      </View>
    );
  }
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const padT = 12;
  const padB = 22;
  const plotH = height - padT - padB;
  const xs = (i: number) => (points.length === 1 ? width / 2 : 4 + (i * (width - 8)) / (points.length - 1));
  const ys = (v: number) => padT + plotH - ((v - lo) / (hi - lo)) * plotH;
  const last = points[points.length - 1];
  const a11y = `${label}: ${points.length} sessions, from ${format(points[0].value)} to ${format(last.value)}`;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityLabel={a11y} style={{ height }}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height}>
            {[0, 0.5, 1].map((t) => (
              <Line key={t} x1={0} x2={width} y1={padT + plotH * t} y2={padT + plotH * t} stroke={c.border} strokeWidth={1} />
            ))}
            <Polyline
              points={points.map((p, i) => `${xs(i)},${ys(p.value)}`).join(' ')}
              fill="none"
              stroke={c.ink}
              strokeWidth={1.5}
            />
            {points.slice(0, -1).map((p, i) => (
              <Rect key={i} x={xs(i) - 2.5} y={ys(p.value) - 2.5} width={5} height={5} fill={c.bg} stroke={c.ink} strokeWidth={1} />
            ))}
            <Rect x={xs(points.length - 1) - 4} y={ys(last.value) - 4} width={8} height={8} fill={c.ember} />
          </Svg>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Label style={{ fontSize: 10 }}>{shortDate(points[0].date)}</Label>
            <Label style={{ fontSize: 10 }}>{shortDate(last.date)}</Label>
          </View>
          <View style={{ position: 'absolute', right: 0, top: 0 }}>
            <Label style={{ fontSize: 10 }}>{format(hi)}</Label>
          </View>
        </>
      ) : null}
    </View>
  );
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeekStrip({ days, todayIndex }: { days: boolean[]; todayIndex: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`Trained ${days.filter(Boolean).length} days this week`}>
      {days.map((on, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <View
            style={{
              alignSelf: 'stretch',
              height: 28,
              borderRadius: radius.sm,
              backgroundColor: on ? c.ember : i > todayIndex ? c.sunken : c.surface,
              borderWidth: 1,
              borderColor: on ? c.ember : c.border,
            }}
          />
          <Text style={[type.label, { fontSize: 10, color: i === todayIndex ? c.ink : c.muted }]}>{DAY_LETTERS[i]}</Text>
        </View>
      ))}
    </View>
  );
}

export function ConsistencyGrid({ grid }: { grid: boolean[][] }) {
  const total = grid.flat().filter(Boolean).length;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessible accessibilityLabel={`${total} training days in the last ${grid.length} weeks`}>
      {grid.map((week, w) => (
        <View key={w} style={{ flex: 1, gap: 4 }}>
          {week.map((on, d) => (
            <View key={d} style={{ height: 14, borderRadius: radius.sm, backgroundColor: on ? c.ember : c.border }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Horizontal bar with an optional target band (min..max) on a 0..scaleMax track. */
export function BandBar({ value, scaleMax, bandMin, bandMax }: { value: number; scaleMax: number; bandMin?: number; bandMax?: number }) {
  const pct = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%` as const;
  return (
    <View style={{ height: 12, backgroundColor: c.sunken, borderRadius: radius.sm, overflow: 'hidden' }}>
      {bandMin != null && bandMax != null ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: pct(bandMin),
            width: `${((bandMax - bandMin) / scaleMax) * 100}%`,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: c.muted,
            borderStyle: 'dashed',
          }}
        />
      ) : null}
      <View style={{ position: 'absolute', left: 0, top: 2, bottom: 2, width: pct(value), backgroundColor: c.ink2, borderRadius: radius.sm }} />
    </View>
  );
}
