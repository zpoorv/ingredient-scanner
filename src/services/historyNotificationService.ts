import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type {
  HistoryNotificationCadence,
  UserProfile,
} from '../models/userProfile';
import type {
  HistoryNotificationPayload,
  HistoryNotificationPermissionState,
  HistoryNotificationScheduleState,
} from '../models/historyNotification';
import { getAuthSession } from '../store';
import { buildHistoryNotifications } from '../utils/historyPersonalization';
import type { ScanHistoryEntry } from './scanHistoryStorage';
import { loadScanHistory } from './scanHistoryStorage';
import { loadUserProfile } from './userProfileService';

const HISTORY_NOTIFICATION_CHANNEL_ID = 'history-insights';
const HISTORY_NOTIFICATION_STORAGE_KEY_PREFIX = 'inqoura/history-notifications/v1';

type ScheduledHistoryNotification = {
  body: string;
  fingerprint: string;
  kind: HistoryNotificationPayload['kind'];
  scheduledAt: Date;
  sourceId: string;
  title: string;
};

const EMPTY_SCHEDULE_STATE: HistoryNotificationScheduleState = {
  cadence: null,
  currentFingerprint: null,
  currentNotificationId: null,
  lastSyncAt: null,
  scheduledAt: null,
};

let isNotificationHandlerConfigured = false;
let lastHandledNotificationResponseId: string | null = null;

function getRecentHistoryEntries(historyEntries: ScanHistoryEntry[]) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return historyEntries.filter(
    (entry) => new Date(entry.scannedAt).getTime() >= sevenDaysAgo
  );
}

function getScheduleStateKey(scopeId: string) {
  return `${HISTORY_NOTIFICATION_STORAGE_KEY_PREFIX}/${scopeId}`;
}

function getHistoryNotificationScopeId(uid?: string | null) {
  return uid ? `user:${uid}` : 'guest';
}

function getNextSundayEvening() {
  const nextDate = new Date();
  nextDate.setHours(19, 0, 0, 0);

  const day = nextDate.getDay();
  const daysUntilSunday = (7 - day) % 7;
  nextDate.setDate(nextDate.getDate() + daysUntilSunday);

  if (nextDate.getTime() <= Date.now()) {
    nextDate.setDate(nextDate.getDate() + 7);
  }

  return nextDate;
}

function getNextSmartNudgeTime() {
  const nextDate = new Date();
  nextDate.setHours(18, 0, 0, 0);

  if (nextDate.getTime() <= Date.now()) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
}

async function loadScheduleState(scopeId: string) {
  const rawValue = await AsyncStorage.getItem(getScheduleStateKey(scopeId));

  if (!rawValue) {
    return EMPTY_SCHEDULE_STATE;
  }

  try {
    return {
      ...EMPTY_SCHEDULE_STATE,
      ...(JSON.parse(rawValue) as Partial<HistoryNotificationScheduleState>),
    };
  } catch {
    return EMPTY_SCHEDULE_STATE;
  }
}

async function saveScheduleState(
  scopeId: string,
  nextState: HistoryNotificationScheduleState
) {
  await AsyncStorage.setItem(getScheduleStateKey(scopeId), JSON.stringify(nextState));
}

function resolvePermissionState(
  settings: Pick<Notifications.NotificationPermissionsStatus, 'canAskAgain' | 'granted'>
): HistoryNotificationPermissionState {
  if (settings.granted) {
    return 'granted';
  }

  return settings.canAskAgain === false ? 'denied' : 'undetermined';
}

function buildWeeklyNotification(
  historyEntries: ScanHistoryEntry[]
): ScheduledHistoryNotification | null {
  if (getRecentHistoryEntries(historyEntries).length < 2) {
    return null;
  }

  const strongestSignal = buildHistoryNotifications(historyEntries, 'weekly')[0];

  if (!strongestSignal) {
    return null;
  }

  const scheduledAt = getNextSundayEvening();
  const sourceId = strongestSignal.id;

  return {
    body: strongestSignal.body,
    fingerprint: `weekly:${sourceId}:${scheduledAt.toISOString()}`,
    kind: 'weekly-recap',
    scheduledAt,
    sourceId,
    title: strongestSignal.title,
  };
}

function buildSmartNotification(
  historyEntries: ScanHistoryEntry[]
): ScheduledHistoryNotification | null {
  if (getRecentHistoryEntries(historyEntries).length < 3) {
    return null;
  }

  const strongestSignal = buildHistoryNotifications(historyEntries, 'smart')[0];

  if (!strongestSignal) {
    return null;
  }

  const scheduledAt = getNextSmartNudgeTime();

  return {
    body: strongestSignal.body,
    fingerprint: `smart:${strongestSignal.id}:${scheduledAt.toISOString()}`,
    kind: strongestSignal.kind,
    scheduledAt,
    sourceId: strongestSignal.id,
    title: strongestSignal.title,
  };
}

function buildScheduledNotification(
  historyEntries: ScanHistoryEntry[],
  cadence: HistoryNotificationCadence
) {
  return cadence === 'smart'
    ? buildSmartNotification(historyEntries)
    : buildWeeklyNotification(historyEntries);
}

async function cancelScheduledNotification(notificationId: string | null) {
  if (!notificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {
    // The notification may already be delivered or cleared by the OS.
  });
}

function getNotificationPayload(
  notification: ScheduledHistoryNotification
): HistoryNotificationPayload {
  return {
    fingerprint: notification.fingerprint,
    kind: notification.kind,
    sourceId: notification.sourceId,
    targetScreen: 'History',
  };
}

function isHistoryNotificationPayload(
  value: unknown
): value is HistoryNotificationPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<HistoryNotificationPayload>;

  return (
    candidate.targetScreen === 'History' &&
    (candidate.kind === 'weekly-recap' ||
      candidate.kind === 'caution-streak' ||
      candidate.kind === 'healthy-streak' ||
      candidate.kind === 'repeat-low-score')
  );
}

export async function initializeHistoryNotifications() {
  if (!isNotificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    isNotificationHandlerConfigured = true;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(HISTORY_NOTIFICATION_CHANNEL_ID, {
      description: 'Weekly shopping recaps and calm history nudges.',
      enableLights: false,
      enableVibrate: false,
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      name: 'History insights',
      showBadge: false,
      sound: null,
      vibrationPattern: [0],
    });
  }
}

export async function getHistoryNotificationPermissionState() {
  return resolvePermissionState(await Notifications.getPermissionsAsync());
}

export async function requestHistoryNotificationPermission() {
  await initializeHistoryNotifications();
  const currentState = await getHistoryNotificationPermissionState();

  if (currentState === 'granted') {
    return currentState;
  }

  return resolvePermissionState(await Notifications.requestPermissionsAsync());
}

export async function openHistoryNotificationSettings() {
  await Linking.openSettings();
}

export async function cancelHistoryNotificationsForUserScope(uid?: string | null) {
  const scopeId = getHistoryNotificationScopeId(uid);
  const currentState = await loadScheduleState(scopeId);

  await cancelScheduledNotification(currentState.currentNotificationId);
  await AsyncStorage.removeItem(getScheduleStateKey(scopeId));
}

export async function cancelCurrentUserHistoryNotifications() {
  await cancelHistoryNotificationsForUserScope(getAuthSession().user?.id ?? null);
}

export async function syncHistoryNotificationsForCurrentUser() {
  const sessionUser = getAuthSession().user;

  if (!sessionUser) {
    await cancelCurrentUserHistoryNotifications();
    return;
  }

  await initializeHistoryNotifications();

  const [profile, permissionState] = await Promise.all([
    loadUserProfile(),
    getHistoryNotificationPermissionState(),
  ]);

  if (
    !profile ||
    !profile.historyNotificationsEnabled ||
    permissionState !== 'granted'
  ) {
    await cancelHistoryNotificationsForUserScope(sessionUser.id);
    return;
  }

  const historyEntries = await loadScanHistory();
  const scopeId = getHistoryNotificationScopeId(sessionUser.id);
  const currentState = await loadScheduleState(scopeId);
  const nextNotification = buildScheduledNotification(
    historyEntries,
    profile.historyNotificationCadence
  );

  if (!nextNotification) {
    await cancelHistoryNotificationsForUserScope(sessionUser.id);
    return;
  }

  if (currentState.currentFingerprint === nextNotification.fingerprint) {
    await saveScheduleState(scopeId, {
      ...currentState,
      cadence: profile.historyNotificationCadence,
      lastSyncAt: new Date().toISOString(),
    });
    return;
  }

  await cancelScheduledNotification(currentState.currentNotificationId);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      autoDismiss: true,
      body: nextNotification.body,
      data: getNotificationPayload(nextNotification),
      title: nextNotification.title,
    },
    trigger: {
      channelId: HISTORY_NOTIFICATION_CHANNEL_ID,
      date: nextNotification.scheduledAt,
      type: Notifications.SchedulableTriggerInputTypes.DATE,
    },
  });

  await saveScheduleState(scopeId, {
    cadence: profile.historyNotificationCadence,
    currentFingerprint: nextNotification.fingerprint,
    currentNotificationId: notificationId,
    lastSyncAt: new Date().toISOString(),
    scheduledAt: nextNotification.scheduledAt.toISOString(),
  });
}

function handleNotificationResponse(
  response: Notifications.NotificationResponse | null,
  onOpenHistory: () => void
) {
  if (!response) {
    return;
  }

  const notificationId = response.notification.request.identifier;

  if (lastHandledNotificationResponseId === notificationId) {
    return;
  }

  if (isHistoryNotificationPayload(response.notification.request.content.data)) {
    lastHandledNotificationResponseId = notificationId;
    onOpenHistory();
  }
}

export function subscribeToHistoryNotificationResponses(
  onOpenHistory: () => void
) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      handleNotificationResponse(response, onOpenHistory);
    }
  );

  return () => {
    subscription.remove();
  };
}

export async function handleInitialHistoryNotificationResponse(
  onOpenHistory: () => void
) {
  handleNotificationResponse(
    await Notifications.getLastNotificationResponseAsync(),
    onOpenHistory
  );
}

export function getHistoryNotificationStatusLabel(
  enabled: boolean,
  permissionState: HistoryNotificationPermissionState,
  cadence: UserProfile['historyNotificationCadence']
) {
  if (permissionState === 'denied') {
    return 'Permission blocked';
  }

  if (!enabled) {
    return 'Off';
  }

  return cadence === 'smart' ? 'Smart nudges' : 'Weekly recap';
}
