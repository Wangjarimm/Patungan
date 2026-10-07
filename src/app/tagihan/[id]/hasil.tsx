import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { IconButton } from '@/components/IconButton';
import { CopyIcon, SendIcon } from '@/components/icons';
import { PersonShareCard } from '@/components/PersonShareCard';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { calculateBill } from '@/lib/calc';
import { formatRupiah } from '@/lib/format';
import { buildShareText } from '@/lib/share-text';
import { billProgress } from '@/lib/summary';
import { useBillsStore } from '@/stores/bills';
import { fonts, fontSizes, lineHeights, radius, spacing, useTheme } from '@/theme';

const COPIED_MESSAGE_MS = 2500;

// Each person's share with breakdown, plus sharing to WhatsApp and the clipboard (F-06, F-07).
export default function ResultScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bill = useBillsStore((state) => state.bills[id]);
  const result = useMemo(() => (bill ? calculateBill(bill) : null), [bill]);
  const progress = useMemo(
    () => (bill && result ? billProgress(bill, result) : null),
    [bill, result],
  );

  // Open the first person who still has to transfer, as in the design.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const first = result?.people.find((p) => progress?.statuses[p.participantId] === 'pending');
    return new Set(first ? [first.participantId] : []);
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!bill || !result || !progress) {
    return null;
  }

  const payer = bill.participants.find((p) => p.id === bill.payerId);
  const text = buildShareText(bill, result);

  const toggle = (participantId: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(participantId)) next.delete(participantId);
      else next.add(participantId);
      return next;
    });

  const share = async () => {
    try {
      await Share.share({ message: text, title: bill.title });
    } catch {
      // The user can still copy the text; nothing to recover here.
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    AccessibilityInfo.announceForAccessibility('Rincian disalin');
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Bagian tiap orang" subtitle={bill.title} />

      <ScrollView contentContainerStyle={styles.content}>
        <View
          accessible
          accessibilityLabel={`${progress.settled} dari ${progress.total} sudah beres, sisa ${formatRupiah(progress.remaining)}`}
          style={styles.progress}>
          <View style={styles.progressText}>
            <Text style={[styles.progressLabel, { color: colors.text }]}>
              <Text style={styles.progressCount}>
                {progress.settled} dari {progress.total}
              </Text>{' '}
              sudah beres
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
              sisa <Text style={{ color: colors.text }}>{formatRupiah(progress.remaining)}</Text>
            </Text>
          </View>
          <View style={styles.segments}>
            {result.people.map((p) => (
              <View
                key={p.participantId}
                style={[
                  styles.segment,
                  {
                    backgroundColor:
                      progress.statuses[p.participantId] === 'pending'
                        ? colors.line
                        : colors.success,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {result.unassignedItemIds.length > 0 ? (
          <Text style={[styles.warning, { color: colors.warning }]}>
            {result.unassignedItemIds.length} menu belum ada yang makan dan tidak dihitung. Tandai
            pemakannya di Isi pesanan.
          </Text>
        ) : null}

        {result.people.map((personShare) => {
          const participant = bill.participants.find((p) => p.id === personShare.participantId);
          if (!participant) return null;
          return (
            <PersonShareCard
              key={participant.id}
              participant={participant}
              share={personShare}
              status={progress.statuses[participant.id] ?? 'pending'}
              settings={bill.settings}
              expanded={expanded.has(participant.id)}
              onToggle={() => toggle(participant.id)}
            />
          );
        })}

        <ReceiptCard contentStyle={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMutedPaper }]}>
              Total tagihan
            </Text>
            <Amount value={result.totals.exact} strong />
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              Terkumpul setelah dibulatkan
            </Text>
            <Amount value={result.totals.rounded} strong />
          </View>
          {result.totals.roundingSurplus >= 0.5 && payer ? (
            <Text style={[styles.summaryNote, { color: colors.textMutedPaper }]}>
              Lebih {formatRupiah(result.totals.roundingSurplus)} dari pembulatan, jadi milik{' '}
              {payer.name}.
            </Text>
          ) : null}
        </ReceiptCard>
      </ScrollView>

      <SafeAreaView
        edges={['bottom']}
        style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
        {copied ? (
          <Text accessibilityLiveRegion="polite" style={[styles.copied, { color: colors.success }]}>
            Rincian disalin. Tempel di grup WhatsApp.
          </Text>
        ) : null}
        <View style={styles.actions}>
          <PillButton
            variant="primary"
            label="Kirim ke WhatsApp"
            icon={(color) => <SendIcon color={color} size={18} />}
            onPress={share}
            style={styles.flex}
          />
          <IconButton
            accessibilityLabel="Salin rincian"
            bordered
            icon={(color) => <CopyIcon color={color} size={20} />}
            onPress={copy}
          />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  progress: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  progressText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  progressLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },
  progressCount: {
    fontFamily: fonts.heading,
  },
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: radius.pill,
  },
  warning: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
  },
  summary: {
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryLabel: {
    flex: 1,
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.small,
  },
  summaryNote: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption + 1,
    lineHeight: lineHeights.caption + 2,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  copied: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.small,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
