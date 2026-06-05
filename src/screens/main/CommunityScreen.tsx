import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SocialComment } from '../../api/social';
import type { SocialPost } from '../../api/social';
import {
  createPostComment,
  createSocialPost,
  fetchPostComments,
  fetchSocialPosts,
  togglePostReaction,
} from '../../api/social';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

function postKey(p: SocialPost) {
  return String(p.id ?? p._id ?? '');
}

const PREVIEW_COMMENTS = 3;

function formatSocialDate(iso?: string): string {
  if (!iso || typeof iso !== 'string') return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function CommunityScreen({
  navigation,
}: {
  navigation: { navigate: (n: string) => void };
}) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerError, setComposerError] = useState('');
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, SocialComment[]>>({});
  const [commentInputByPostId, setCommentInputByPostId] = useState<Record<string, string>>({});
  const [commentSheetPost, setCommentSheetPost] = useState<SocialPost | null>(null);
  const [commentsSheetError, setCommentsSheetError] = useState('');
  const [loadingCommentPostId, setLoadingCommentPostId] = useState<string | null>(null);
  const [sendingCommentPostId, setSendingCommentPostId] = useState<string | null>(null);
  const [reactingPostId, setReactingPostId] = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchedCommentsRef = useRef<Set<string>>(new Set());

  const commentSheetId = commentSheetPost ? postKey(commentSheetPost) : '';

  const clearComposerError = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setComposerError('');
  }, []);

  const load = useCallback(async () => {
    try {
      const { posts: list } = await fetchSocialPosts(token, { limit: 25 });
      setPosts(list);
      prefetchedCommentsRef.current.clear();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  /** Подгружаем 2–3 комментария сразу в ленту, если они есть */
  useEffect(() => {
    if (!posts.length) return;
    let cancelled = false;
    void (async () => {
      const candidates = posts.filter((p) => Number(p.commentsCount || 0) > 0).slice(0, 20);
      for (const post of candidates) {
        if (cancelled) break;
        const pid = postKey(post);
        if (!pid || prefetchedCommentsRef.current.has(pid)) continue;
        prefetchedCommentsRef.current.add(pid);
        try {
          const response = await fetchPostComments(pid, token);
          if (cancelled) return;
          setCommentsByPostId((prev) => {
            if (prev[pid]?.length) return prev;
            return { ...prev, [pid]: response.comments || [] };
          });
        } catch {
          prefetchedCommentsRef.current.delete(pid);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [posts, token]);

  useFocusEffect(
    useCallback(() => {
      return () => clearComposerError();
    }, [clearComposerError]),
  );

  useEffect(() => {
    if (!composerError) return;
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setComposerError('');
      dismissTimerRef.current = null;
    }, 7000);
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [composerError]);

  /** Подгрузка комментариев при открытии нижней панели */
  useEffect(() => {
    if (!commentSheetId || !commentSheetPost) return;
    if (commentsByPostId[commentSheetId]) return;
    let cancelled = false;
    setCommentsSheetError('');
    setLoadingCommentPostId(commentSheetId);
    fetchPostComments(commentSheetId, token)
      .then((response) => {
        if (!cancelled) {
          setCommentsByPostId((prev) => ({ ...prev, [commentSheetId]: response.comments || [] }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCommentsSheetError('Не удалось загрузить комментарии');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCommentPostId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [commentSheetId, commentSheetPost, token, commentsByPostId]);

  async function submitPost() {
    if (!token) return;
    clearComposerError();
    try {
      await createSocialPost({ title: title.trim(), content: content.trim(), tags: [] }, token);
      setTitle('');
      setContent('');
      setComposerOpen(false);
      await load();
    } catch (e) {
      setComposerError(e instanceof Error ? e.message : 'Не удалось опубликовать');
    }
  }

  function onRefresh() {
    clearComposerError();
    setRefreshing(true);
    load();
  }

  async function handlePostReaction(post: SocialPost, reactionType: 'like' | 'dislike') {
    if (!token) {
      setComposerError('Войдите, чтобы ставить реакции');
      return;
    }
    const pid = postKey(post);
    if (!pid) return;
    setReactingPostId(pid);
    try {
      const response = await togglePostReaction(pid, reactionType, token);
      setPosts((prev) =>
        prev.map((item) =>
          postKey(item) === pid
            ? {
                ...item,
                likes: response.likes,
                dislikes: response.dislikes,
                viewerReaction: response.reactionType ?? null,
              }
            : item,
        ),
      );
      setCommentSheetPost((cur) =>
        cur && postKey(cur) === pid
          ? {
              ...cur,
              likes: response.likes,
              dislikes: response.dislikes,
              viewerReaction: response.reactionType ?? null,
            }
          : cur,
      );
    } catch (e) {
      setComposerError(e instanceof Error ? e.message : 'Не удалось поставить реакцию');
    } finally {
      setReactingPostId(null);
    }
  }

  function openCommentSheet(post: SocialPost) {
    const pid = postKey(post);
    if (!pid) return;
    setCommentSheetPost(post);
  }

  function closeCommentSheet() {
    setCommentSheetPost(null);
    setCommentsSheetError('');
  }

  async function handleSendComment(postId: string) {
    if (!token) {
      setComposerError('Войдите, чтобы комментировать');
      return;
    }
    const contentValue = (commentInputByPostId[postId] || '').trim();
    if (!contentValue) return;
    setSendingCommentPostId(postId);
    try {
      const response = await createPostComment(postId, contentValue, token);
      setCommentInputByPostId((prev) => ({ ...prev, [postId]: '' }));
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), response.comment],
      }));
      setPosts((prev) =>
        prev.map((item) =>
          postKey(item) === postId
            ? { ...item, commentsCount: Number(item.commentsCount || 0) + 1 }
            : item,
        ),
      );
      setCommentSheetPost((cur) =>
        cur && postKey(cur) === postId
          ? { ...cur, commentsCount: Number(cur.commentsCount || 0) + 1 }
          : cur,
      );
    } catch (e) {
      setComposerError(e instanceof Error ? e.message : 'Не удалось отправить комментарий');
    } finally {
      setSendingCommentPostId(null);
    }
  }

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.headerBar}>
        {token ? (
          <Pressable
            style={s.headerIconBtn}
            onPress={() => {
              clearComposerError();
              setComposerOpen(true);
            }}
            accessibilityLabel="Новый пост"
            hitSlop={10}
          >
            <Ionicons name="add" size={28} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={s.headerIconPlaceholder} />
        )}
        <Text style={s.headerTitle}>Сообщество</Text>
        <Pressable style={s.headerIconBtn} onPress={() => navigation.navigate('Leaderboard')} hitSlop={10}>
          <Ionicons name="trophy-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>

      {!token ? <Text style={s.guest}>Войдите, чтобы публиковать посты.</Text> : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.accent} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => postKey(p)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const postId = postKey(item);
            if (!postId) return null;
            const dateStr = formatSocialDate(
              typeof item.createdAt === 'string' ? item.createdAt : undefined,
            );
            const allComments = commentsByPostId[postId] || [];
            const previewComments = allComments.slice(0, PREVIEW_COMMENTS);
            const commentsLoading = loadingCommentPostId === postId && !allComments.length;
            const totalComments = Number(item.commentsCount || allComments.length || 0);

            return (
              <View style={s.card}>
                <Text style={s.cardTitle}>{item.title}</Text>
                {dateStr ? <Text style={s.cardDate}>{dateStr}</Text> : null}
                <Text style={s.cardAuthor}>
                  {item.author?.username || item.author?.name || 'Автор'}
                </Text>
                <Text style={s.cardBody} numberOfLines={6}>
                  {item.content}
                </Text>
                <View style={s.actionsRow}>
                  <Pressable
                    style={[
                      s.actionBtn,
                      item.viewerReaction === 'like' && s.actionBtnActive,
                      reactingPostId === postId && s.actionBtnDisabled,
                    ]}
                    onPress={() => handlePostReaction(item, 'like')}
                  >
                    <Text style={[s.actionText, item.viewerReaction === 'like' && s.actionTextActive]}>
                      👍 {Number(item.likes || 0)}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      s.actionBtn,
                      item.viewerReaction === 'dislike' && s.actionBtnDanger,
                      reactingPostId === postId && s.actionBtnDisabled,
                    ]}
                    onPress={() => handlePostReaction(item, 'dislike')}
                  >
                    <Text style={[s.actionText, item.viewerReaction === 'dislike' && s.actionTextDanger]}>
                      👎 {Number(item.dislikes || 0)}
                    </Text>
                  </Pressable>
                  <Pressable style={s.actionBtn} onPress={() => openCommentSheet(item)}>
                    <Text style={s.actionText}>💬 {totalComments}</Text>
                  </Pressable>
                </View>

                {totalComments > 0 || commentsLoading ? (
                  <View style={s.commentsPreview}>
                    <Text style={s.commentsPreviewTitle}>Комментарии</Text>
                    {commentsLoading ? (
                      <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 8 }} />
                    ) : previewComments.length ? (
                      previewComments.map((comment, idx) => {
                        const cDate = formatSocialDate(
                          typeof comment.createdAt === 'string' ? comment.createdAt : undefined,
                        );
                        return (
                          <View key={`${comment.id || comment._id || idx}-preview`} style={s.previewComment}>
                            <View style={s.commentHead}>
                              <Text style={s.commentAuthor}>
                                {comment.author?.username || comment.author?.name || 'Пользователь'}
                              </Text>
                              {cDate ? <Text style={s.commentDate}>{cDate}</Text> : null}
                            </View>
                            <Text style={s.commentText} numberOfLines={4}>
                              {comment.content || ''}
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={s.previewEmpty}>Загрузка комментариев…</Text>
                    )}
                    {totalComments > PREVIEW_COMMENTS ? (
                      <Pressable onPress={() => openCommentSheet(item)} style={s.allCommentsLink}>
                        <Text style={s.allCommentsLinkTxt}>
                          Все комментарии ({totalComments}) →
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {token ? (
                  <View style={s.inlineComposer}>
                    <TextInput
                      value={commentInputByPostId[postId] || ''}
                      onChangeText={(t) =>
                        setCommentInputByPostId((prev) => ({ ...prev, [postId]: t }))
                      }
                      style={s.inlineCommentInput}
                      placeholder="Написать комментарий…"
                      placeholderTextColor={colors.ink3}
                    />
                    <Pressable
                      style={[
                        s.inlineCommentSend,
                        sendingCommentPostId === postId && s.actionBtnDisabled,
                      ]}
                      onPress={() => handleSendComment(postId)}
                      disabled={sendingCommentPostId === postId}
                    >
                      <Ionicons name="send" size={18} color={colors.surface} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={s.empty}>Лента пуста</Text>}
        />
      )}

      {/* Модалка: новый пост */}
      <Modal
        visible={composerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setComposerOpen(false)}
      >
        <KeyboardAvoidingView
          style={s.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.bottom}
        >
          <Pressable style={s.modalBackdrop} onPress={() => setComposerOpen(false)} />
          <View style={[s.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Новый пост</Text>
              <Pressable onPress={() => setComposerOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={26} color={colors.ink2} />
              </Pressable>
            </View>
            <TextInput
              style={s.input}
              placeholder="Заголовок (от 8 символов)"
              placeholderTextColor={colors.ink3}
              value={title}
              onChangeText={(t) => {
                clearComposerError();
                setTitle(t);
              }}
            />
            <TextInput
              style={[s.input, s.area]}
              placeholder="Текст"
              placeholderTextColor={colors.ink3}
              multiline
              value={content}
              onChangeText={(t) => {
                clearComposerError();
                setContent(t);
              }}
            />
            <Pressable style={s.publish} onPress={submitPost}>
              <Text style={s.publishText}>Опубликовать</Text>
            </Pressable>
            {composerError ? (
              <View style={s.errBox}>
                <Text style={s.err}>{composerError}</Text>
                <Pressable onPress={clearComposerError} hitSlop={8}>
                  <Text style={s.errDismiss}>Скрыть</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Нижний экран: комментарии */}
      <Modal
        visible={Boolean(commentSheetPost)}
        transparent
        animationType="slide"
        onRequestClose={closeCommentSheet}
      >
        <KeyboardAvoidingView
          style={s.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.bottom}
        >
          <Pressable style={s.modalBackdrop} onPress={closeCommentSheet} />
          <View style={[s.commentsSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sheetTitle}>Комментарии</Text>
                {commentSheetPost?.title ? (
                  <Text style={s.sheetSubtitle} numberOfLines={2}>
                    {commentSheetPost.title}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={closeCommentSheet} hitSlop={12}>
                <Ionicons name="close" size={26} color={colors.ink2} />
              </Pressable>
            </View>

            {commentsSheetError ? (
              <Text style={s.sheetErr}>{commentsSheetError}</Text>
            ) : null}

            {loadingCommentPostId === commentSheetId ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={colors.accent} />
            ) : (
              <ScrollView
                style={s.commentsScroll}
                contentContainerStyle={s.commentsScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {(commentsByPostId[commentSheetId] || []).map((comment, idx) => {
                  const cDate = formatSocialDate(
                    typeof comment.createdAt === 'string' ? comment.createdAt : undefined,
                  );
                  return (
                    <View key={`${comment.id || comment._id || idx}`} style={s.commentRow}>
                      <View style={s.commentHead}>
                        <Text style={s.commentAuthor}>
                          {comment.author?.username || comment.author?.name || 'Пользователь'}
                        </Text>
                        {cDate ? <Text style={s.commentDate}>{cDate}</Text> : null}
                      </View>
                      <Text style={s.commentText}>{comment.content || ''}</Text>
                    </View>
                  );
                })}
                {!(commentsByPostId[commentSheetId] || []).length && loadingCommentPostId !== commentSheetId ? (
                  <Text style={s.emptyComment}>Комментариев пока нет</Text>
                ) : null}
              </ScrollView>
            )}

            {token ? (
              <View style={s.commentComposer}>
                <TextInput
                  value={commentInputByPostId[commentSheetId] || ''}
                  onChangeText={(t) =>
                    setCommentInputByPostId((prev) => ({
                      ...prev,
                      [commentSheetId]: t,
                    }))
                  }
                  style={s.commentInput}
                  placeholder="Написать комментарий…"
                  placeholderTextColor={colors.ink3}
                />
                <Pressable
                  style={[
                    s.commentSend,
                    sendingCommentPostId === commentSheetId && s.actionBtnDisabled,
                  ]}
                  onPress={() => commentSheetId && handleSendComment(commentSheetId)}
                  disabled={sendingCommentPostId === commentSheetId || !commentSheetId}
                >
                  <Text style={s.commentSendText}>Отправить</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={s.guestCommentHint}>Войдите, чтобы комментировать.</Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    headerIconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerIconPlaceholder: { width: 44, height: 44 },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '600',
      color: colors.ink,
    },
    guest: { marginHorizontal: 16, marginBottom: 8, marginTop: 8, color: colors.ink3, fontSize: 14 },
    list: { paddingHorizontal: 16, paddingBottom: 32 },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      marginBottom: 10,
      backgroundColor: colors.surface2,
    },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, marginBottom: 4 },
    cardDate: { fontSize: 12, color: colors.ink3, marginBottom: 6 },
    cardAuthor: { fontSize: 13, color: colors.accent, marginBottom: 8 },
    cardBody: { fontSize: 14, color: colors.ink2, lineHeight: 20 },
    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionBtn: {
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: colors.surface,
    },
    actionBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    actionBtnDanger: { borderColor: colors.danger, backgroundColor: colors.surface2 },
    actionBtnDisabled: { opacity: 0.6 },
    actionText: { fontSize: 13, color: colors.ink2, fontWeight: '600' },
    actionTextActive: { color: colors.accent },
    actionTextDanger: { color: colors.danger },
    commentsPreview: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    commentsPreviewTitle: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    previewComment: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      padding: 10,
      marginBottom: 8,
      borderRadius: 8,
    },
    previewEmpty: { fontSize: 13, color: colors.ink3, marginBottom: 4 },
    allCommentsLink: { paddingVertical: 6 },
    allCommentsLinkTxt: { fontSize: 13, fontWeight: '600', color: colors.accent },
    inlineComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    inlineCommentInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.ink,
      backgroundColor: colors.surface,
      borderRadius: 8,
      fontSize: 14,
    },
    inlineCommentSend: {
      backgroundColor: colors.ink,
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    bottomSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16,
      paddingTop: 8,
      borderWidth: 1,
      borderColor: colors.line,
      borderBottomWidth: 0,
      maxHeight: '88%',
    },
    commentsSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16,
      paddingTop: 8,
      borderWidth: 1,
      borderColor: colors.line,
      borderBottomWidth: 0,
      maxHeight: '92%',
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.line,
      marginBottom: 12,
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
    sheetSubtitle: { fontSize: 13, color: colors.ink2, marginTop: 4, lineHeight: 18 },
    sheetErr: { color: colors.danger, fontSize: 13, marginBottom: 10 },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 10,
      color: colors.ink,
      backgroundColor: colors.surface2,
      marginBottom: 10,
    },
    area: { minHeight: 100, textAlignVertical: 'top' },
    publish: { backgroundColor: colors.ink, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    publishText: { color: colors.surface, fontWeight: '600', fontSize: 16 },
    errBox: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.danger,
      paddingLeft: 10,
      paddingVertical: 4,
    },
    err: { flex: 1, color: colors.danger, fontSize: 13, lineHeight: 18 },
    errDismiss: { fontSize: 13, color: colors.accent, fontWeight: '600' },
    commentsScroll: { maxHeight: 420 },
    commentsScrollContent: { paddingBottom: 12 },
    commentRow: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
      padding: 12,
      marginBottom: 10,
      borderRadius: 8,
    },
    commentHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 8,
      marginBottom: 6,
    },
    commentAuthor: { color: colors.ink, fontWeight: '600', fontSize: 13, flex: 1 },
    commentDate: { fontSize: 11, color: colors.ink3 },
    commentText: { color: colors.ink2, fontSize: 14, lineHeight: 20 },
    emptyComment: { color: colors.ink3, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
    commentComposer: { flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
    commentInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.ink,
      backgroundColor: colors.surface2,
      borderRadius: 8,
    },
    commentSend: {
      backgroundColor: colors.ink,
      paddingHorizontal: 14,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
    },
    commentSendText: { color: colors.surface, fontWeight: '600', fontSize: 13 },
    guestCommentHint: { color: colors.ink3, marginTop: 10, fontSize: 13, textAlign: 'center' },
    empty: { textAlign: 'center', color: colors.ink3, marginTop: 24 },
  });
}
