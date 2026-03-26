import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import type { ScanHistoryEntry } from './scanHistoryStorage';
import { getFirebaseAppInstance } from './firebaseApp';
import type { UserProfile } from '../models/userProfile';

function getDb() {
  return getFirestore(getFirebaseAppInstance());
}

function getUserDocRef(uid: string) {
  return doc(getDb(), 'users', uid);
}

function getHistoryCollectionRef(uid: string) {
  return collection(getDb(), 'users', uid, 'scanHistory');
}

export async function loadRemoteUserProfile(uid: string) {
  try {
    const snapshot = await getDoc(getUserDocRef(uid));
    return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
  } catch {
    return null;
  }
}

export async function saveRemoteUserProfile(profile: UserProfile) {
  try {
    await setDoc(getUserDocRef(profile.uid), profile, { merge: true });
  } catch {
    // Firestore sync is optional. Local profile storage still remains the source of truth.
  }
}

export async function loadRemoteScanHistory(uid: string) {
  try {
    const snapshot = await getDocs(getHistoryCollectionRef(uid));
    return snapshot.docs.map((item) => item.data() as ScanHistoryEntry);
  } catch {
    return [];
  }
}

export async function saveRemoteScanHistoryEntry(uid: string, entry: ScanHistoryEntry) {
  try {
    await setDoc(doc(getHistoryCollectionRef(uid), entry.id), entry, { merge: true });
  } catch {
    // Remote history is best-effort and should not block the on-device experience.
  }
}

export async function deleteRemoteScanHistoryEntries(uid: string, ids: string[]) {
  try {
    const batch = writeBatch(getDb());
    ids.forEach((id) => {
      batch.delete(doc(getHistoryCollectionRef(uid), id));
    });
    await batch.commit();
  } catch {
    // Ignore remote cleanup failures and preserve local behavior.
  }
}

export async function replaceRemoteScanHistory(uid: string, entries: ScanHistoryEntry[]) {
  try {
    const existingEntries = await getDocs(getHistoryCollectionRef(uid));
    const batch = writeBatch(getDb());

    existingEntries.docs.forEach((item) => batch.delete(item.ref));
    entries.forEach((entry) => {
      batch.set(doc(getHistoryCollectionRef(uid), entry.id), entry);
    });

    await batch.commit();
  } catch {
    // Sync remains optional while Firestore is being rolled out.
  }
}

export async function deleteRemoteUserData(uid: string) {
  const historyDocs = await getDocs(getHistoryCollectionRef(uid));
  const batch = writeBatch(getDb());

  historyDocs.docs.forEach((item) => batch.delete(item.ref));
  batch.delete(getUserDocRef(uid));

  await batch.commit();
}
