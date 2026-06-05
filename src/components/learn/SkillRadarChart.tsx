import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { useAppTheme } from '../../context/ThemeContext';

export type VerifiedSkill = {
  id?: string;
  domainLabel?: string;
  level?: string;
  score?: number;
};

type Props = {
  skills: VerifiedSkill[];
};

const CX = 100;
const CY = 100;
const R = 70;

export function SkillRadarChart({ skills }: Props) {
  const { colors } = useAppTheme();
  const s = styles(colors);

  const normalized = useMemo(
    () =>
      skills
        .filter((sk) => typeof sk.score === 'number')
        .map((sk) => ({
          id: String(sk.id || sk.domainLabel),
          domainLabel: String(sk.domainLabel || 'Навык'),
          level: String(sk.level || ''),
          score: Math.min(100, Math.max(0, Number(sk.score))),
        })),
    [skills],
  );

  if (normalized.length === 0) {
    return <Text style={s.empty}>Подтверждённые навыки появятся после оценок.</Text>;
  }

  if (normalized.length < 3) {
    return (
      <View style={s.bars}>
        {normalized.map((skill) => (
          <View key={skill.id} style={s.barRow}>
            <View style={s.barHead}>
              <Text style={s.barLabel}>{skill.domainLabel}</Text>
              <Text style={s.barMeta}>
                {skill.level} · {skill.score}/100
              </Text>
            </View>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${skill.score}%` }]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  const n = normalized.length;
  const rings = [0.25, 0.5, 0.75, 1];
  const axes = normalized.map((skill, i) => {
    const a = (2 * Math.PI / n) * i - Math.PI / 2;
    return {
      skill,
      x2: CX + R * Math.cos(a),
      y2: CY + R * Math.sin(a),
      lx: CX + (R + 18) * Math.cos(a),
      ly: CY + (R + 18) * Math.sin(a),
      anchor: Math.cos(a) > 0.2 ? 'start' : Math.cos(a) < -0.2 ? 'end' : 'middle',
    };
  });

  const dataPoints = normalized
    .map((skill, i) => {
      const a = (2 * Math.PI / n) * i - Math.PI / 2;
      const r = (skill.score / 100) * R;
      return `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
    })
    .join(' ');

  return (
    <View style={s.wrap}>
      <Svg width="100%" height={220} viewBox="0 0 200 200">
        {rings.map((f) => {
          const pts = normalized
            .map((_, i) => {
              const a = (2 * Math.PI / n) * i - Math.PI / 2;
              return `${CX + R * f * Math.cos(a)},${CY + R * f * Math.sin(a)}`;
            })
            .join(' ');
          return <Polygon key={f} points={pts} fill="none" stroke={colors.line} strokeWidth={1} />;
        })}
        {axes.map((ax) => (
          <Line key={ax.skill.id} x1={CX} y1={CY} x2={ax.x2} y2={ax.y2} stroke={colors.line} strokeWidth={1} />
        ))}
        <Polygon points={dataPoints} fill={colors.accentMuted} stroke={colors.accent} strokeWidth={2} />
        {normalized.map((skill, i) => {
          const a = (2 * Math.PI / n) * i - Math.PI / 2;
          const r = (skill.score / 100) * R;
          return (
            <Circle
              key={`dot-${skill.id}`}
              cx={CX + r * Math.cos(a)}
              cy={CY + r * Math.sin(a)}
              r={3}
              fill={colors.accent}
            />
          );
        })}
        {axes.map((ax) => (
          <SvgText
            key={`lbl-${ax.skill.id}`}
            x={ax.lx}
            y={ax.ly}
            fill={colors.ink3}
            fontSize={8}
            textAnchor={ax.anchor as 'start' | 'end' | 'middle'}
          >
            {ax.skill.domainLabel.length > 12 ? `${ax.skill.domainLabel.slice(0, 10)}…` : ax.skill.domainLabel}
          </SvgText>
        ))}
      </Svg>

      <View style={s.legend}>
        {normalized.map((skill) => (
          <View key={`leg-${skill.id}`} style={s.legendRow}>
            <Text style={s.legendLabel}>{skill.domainLabel}</Text>
            <Text style={s.legendMeta}>{skill.level}</Text>
            <Text style={s.legendScore}>{skill.score}/100</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    empty: { fontSize: 14, color: colors.ink3 },
    bars: { gap: 12 },
    barRow: { gap: 6 },
    barHead: { flexDirection: 'row', justifyContent: 'space-between' },
    barLabel: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
    barMeta: { fontSize: 12, color: colors.ink3 },
    barTrack: { height: 8, backgroundColor: colors.line, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: colors.accent },
    legend: { gap: 8 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendLabel: { flex: 1, fontSize: 13, color: colors.ink },
    legendMeta: { fontSize: 12, color: colors.ink3 },
    legendScore: { fontSize: 13, fontWeight: '700', color: colors.accent },
  });
}
