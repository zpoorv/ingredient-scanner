import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const app = initializeApp(window.__ADMIN_PANEL_CONFIG__);
const auth = getAuth(app);
const db = getFirestore(app);

export function subscribeToSession(handler) {
  return onAuthStateChanged(auth, handler);
}

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export async function loadOwnProfile(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function loadUsers() {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs
    .map((item) => item.data())
    .sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || ''));
}

export async function saveUser(profile) {
  await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
}

export async function loadCorrectionReports() {
  const snapshot = await getDocs(collection(db, 'correctionReports'));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => {
      const priorityGap = (right.priorityScore || 0) - (left.priorityScore || 0);

      if (priorityGap !== 0) {
        return priorityGap;
      }

      return (right.createdAt || '').localeCompare(left.createdAt || '');
    });
}

export async function saveCorrectionReportStatus(reportId, patch) {
  await setDoc(doc(db, 'correctionReports', reportId), patch, { merge: true });
}

export async function loadProductOverride(barcode) {
  const snapshot = await getDoc(doc(db, 'productOverrides', barcode));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function loadProductOverrides() {
  const snapshot = await getDocs(collection(db, 'productOverrides'));
  return snapshot.docs
    .map((item) => item.data())
    .sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || ''));
}

export async function saveProductOverride(barcode, payload) {
  await setDoc(doc(db, 'productOverrides', barcode), payload, { merge: false });
}

export async function deleteProductOverride(barcode) {
  await deleteDoc(doc(db, 'productOverrides', barcode));
}

export async function loadAdminAppConfig() {
  const snapshot = await getDoc(doc(db, 'adminConfig', 'general'));

  return snapshot.exists()
    ? snapshot.data()
    : {
        enableHistory: true,
        enableIngredientOcr: true,
        enableManualBarcodeEntry: true,
        enableRuleBasedSuggestions: true,
        homeAnnouncementBody: null,
        homeAnnouncementTitle: null,
        resultDisclaimer: null,
        resultSupportMessage: null,
        shareFooterText: null,
        showSourceAttribution: true,
        supportEmail: null,
        updatedAt: null,
      };
}

export async function saveAdminAppConfig(config) {
  await setDoc(doc(db, 'adminConfig', 'general'), config, { merge: true });
}
