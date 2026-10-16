import { useEffect, useRef, useState } from 'react';
import { TextInput, type StyleProp, type TextStyle } from 'react-native';

import { parseNum } from '../lib/format';
import { c, mono, radius } from '../theme';

/**
 * Numeric input that keeps the raw text while typing ("102." stays "102.")
 * and commits parsed numbers upward. Re-syncs from props when not focused.
 */
export function NumberField({
  value,
  onCommit,
  placeholder,
  decimal = true,
  accessibilityLabel,
  style,
  done,
}: {
  value: number | null;
  onCommit: (n: number | null) => void;
  placeholder?: string;
  decimal?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<TextStyle>;
  done?: boolean;
}) {
  const fmt = (v: number | null) => (v == null ? '' : String(v));
  const [text, setText] = useState(fmt(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(fmt(value));
  }, [value]);

  return (
    <TextInput
      value={text}
      onChangeText={(t) => {
        const cleaned = decimal ? t.replace(/[^0-9.,]/g, '') : t.replace(/[^0-9]/g, '');
        setText(cleaned);
        const n = parseNum(cleaned);
        if (cleaned === '' || n !== null) onCommit(n);
      }}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setText(fmt(value));
      }}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      selectTextOnFocus
      placeholder={placeholder}
      placeholderTextColor={c.muted}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          height: 34,
          minWidth: 52,
          backgroundColor: done ? 'transparent' : c.sunken,
          borderRadius: radius.sm,
          color: c.ink,
          textAlign: 'center',
          fontFamily: mono,
          fontSize: 15,
          paddingVertical: 0,
        },
        style,
      ]}
    />
  );
}
