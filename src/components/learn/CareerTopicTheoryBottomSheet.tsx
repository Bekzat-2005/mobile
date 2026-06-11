import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../context/ThemeContext';
import { radius } from '../../theme/colors';

const THEORY_BODY = '#4B5563';

export type CareerTheorySection = { title?: string; content?: string };
export type CareerQaItem = { question?: string; answer?: string };

type Props = {
  visible: boolean;
  topicTitle: string;
  summary: string;
  sections: CareerTheorySection[];
  qaItems: CareerQaItem[];
  onClose: () => void;
  onEnhanceTheory?: () => void;
  /** Внутри другого Modal — без второго RN Modal (iOS не показывает вложенные). */
  embedded?: boolean;
};

function TheorySheetContent({
  topicTitle,
  summary,
  sections,
  qaItems,
  onClose,
  onEnhanceTheory,
  colors,
}: Omit<Props, 'visible' | 'embedded'> & { colors: ReturnType<typeof useAppTheme>['colors'] }) {
  const s = styles(colors);
  const hasContent = Boolean(summary.trim() || sections.length || qaItems.length);

  return (
    <View style={s.sheet}>
      <View style={s.handleRow}>
        <View style={s.handle} />
      </View>

      <View style={s.head}>
        <View style={s.headText}>
          <Text style={s.kicker}>Дополнительная теория</Text>
          <Text style={s.title} numberOfLines={2}>
            {topicTitle}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Закрыть">
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.content}>
          {!hasContent ? (
            <Text style={s.body}>Теория для этой темы пока не сгенерирована.</Text>
          ) : null}

          {summary ? <Text style={s.summary}>{summary}</Text> : null}

          {sections.map((sec, i) => (
            <View key={`${sec.title || 'sec'}-${i}`} style={s.section}>
              {sec.title ? <Text style={s.sectionTitle}>{sec.title}</Text> : null}
              {sec.content ? <Text style={s.body}>{sec.content}</Text> : null}
            </View>
          ))}

          {qaItems.length > 0 ? (
            <View style={s.qaBlock}>
              <Text style={s.qaHeading}>Вопросы и ответы</Text>
              {qaItems.map((qa, i) => (
                <View key={`${qa.question || 'qa'}-${i}`} style={s.qaItem}>
                  {qa.question ? <Text style={s.qaQuestion}>{qa.question}</Text> : null}
                  {qa.answer ? <Text style={s.body}>{qa.answer}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={s.footer}>
        {onEnhanceTheory ? (
          <Pressable style={s.ghostBtn} onPress={onEnhanceTheory}>
            <Text style={s.ghostBtnTxt}>Дополнить теорию</Text>
          </Pressable>
        ) : null}
        <Pressable style={s.closeBtn} onPress={onClose}>
          <Text style={s.closeBtnTxt}>Закрыть</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function CareerTopicTheoryBottomSheet({
  visible,
  topicTitle,
  summary,
  sections,
  qaItems,
  onClose,
  onEnhanceTheory,
  embedded = false,
}: Props) {
  const { colors } = useAppTheme();
  const s = styles(colors);

  if (!visible) return null;

  if (embedded) {
    return (
      <View style={s.embeddedRoot} pointerEvents="box-none">
        <Pressable style={s.embeddedBackdrop} onPress={onClose} accessibilityLabel="Закрыть" />
        <SafeAreaView style={s.embeddedWrap} edges={['bottom']} pointerEvents="box-none">
          <TheorySheetContent
            topicTitle={topicTitle}
            summary={summary}
            sections={sections}
            qaItems={qaItems}
            onClose={onClose}
            onEnhanceTheory={onEnhanceTheory}
            colors={colors}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent={false}
    >
      <SafeAreaView style={s.safeWrap} edges={['bottom']}>
        <View style={s.backdrop}>
          <Pressable style={s.backdropTap} onPress={onClose} accessibilityLabel="Закрыть" />
          <TheorySheetContent
            topicTitle={topicTitle}
            summary={summary}
            sections={sections}
            qaItems={qaItems}
            onClose={onClose}
            onEnhanceTheory={onEnhanceTheory}
            colors={colors}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    embeddedRoot: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 100,
      elevation: 100,
    },
    embeddedBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    embeddedWrap: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    safeWrap: { flex: 1, justifyContent: 'flex-end' },
    backdropTap: { flex: 1 },
    sheet: {
      maxHeight: '88%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 16,
    },
    handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.line,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 12,
    },
    headText: { flex: 1 },
    kicker: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.accentSolid,
      marginBottom: 4,
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.ink, lineHeight: 24 },
    scroll: { maxHeight: 460 },
    content: { padding: 16, gap: 16 },
    summary: {
      fontSize: 15,
      lineHeight: 24,
      color: THEORY_BODY,
    },
    section: { gap: 8 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 22 },
    body: {
      fontSize: 15,
      lineHeight: 24,
      color: THEORY_BODY,
    },
    qaBlock: { gap: 12, marginTop: 4 },
    qaHeading: { fontSize: 14, fontWeight: '700', color: colors.ink },
    qaItem: {
      gap: 6,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    qaQuestion: { fontSize: 14, fontWeight: '600', color: colors.ink, lineHeight: 21 },
    footer: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
    ghostBtn: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
    },
    ghostBtnTxt: { fontSize: 14, fontWeight: '600', color: colors.accentSolid },
    closeBtn: {
      minHeight: 48,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSolid,
    },
    closeBtnTxt: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  });
}
