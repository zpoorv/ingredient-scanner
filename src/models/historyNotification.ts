import type { HistoryNotificationCadence } from './userProfile';

export type HistoryNotificationKind =
  | 'weekly-recap'
  | 'caution-streak'
  | 'healthy-streak'
  | 'repeat-low-score'
  | 'weekly-goal';

export type HistoryNotificationPayload = {
  fingerprint?: string;
  kind: HistoryNotificationKind;
  sourceId?: string;
  targetScreen: 'History';
};

export type HistoryNotificationPermissionState =
  | 'denied'
  | 'granted'
  | 'undetermined';

export type HistoryNotificationScheduleState = {
  cadence: HistoryNotificationCadence | null;
  currentFingerprint: string | null;
  currentNotificationId: string | null;
  lastSyncAt: string | null;
  scheduledAt: string | null;
};
