// HRNtrack — alertes « nouvelles figurines » sur le téléphone / l'ordinateur (Firebase Cloud Messaging).
// Fonctionnement : la personne clique sur « Me prévenir des nouveautés » → le navigateur demande l'autorisation →
// l'appareil est inscrit auprès de Firebase. À chaque mise à jour du catalogue, l'admin envoie un message depuis
// la console Firebase (Messaging → nouvelle campagne → appli web HRNtrack) : sw.js l'affiche, même site fermé.
// Sur iPhone / iPad, les notifications ne marchent que dans l'appli installée (écran d'accueil, iOS 16.4+).
import { app } from './firebase.js';
import { getMessaging, getToken, deleteToken, isSupported } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

// Clé publique « Web Push » du projet : console Firebase → Paramètres du projet → Cloud Messaging →
// Configuration Web → Certificats push Web → Générer une paire de clés. (Clé publique : sans danger dans le code.)
export const VAPID_KEY = 'BENnx0ILaRQybIL9S9tMNoZqQOD-BxHaNGnVjn3MQDBhR5S_A6S_CoZG6ikY6am5kG-v06sBqjNddb2VYOTu318';

const KEY = 'HRN_PUSH';
const remember = (v) => { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { /* stockage indisponible */ } };
const remembered = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/**
 * État des alertes sur cet appareil :
 * 'on' | 'off' | 'denied' (refusé dans le navigateur) | 'ios-install' (iPhone : installer l'appli d'abord)
 * | 'unsupported' | 'unconfigured' (clé Web Push pas encore renseignée)
 */
export async function pushStatus() {
    if (!VAPID_KEY) return 'unconfigured';
    if (isIos && !isStandalone()) return 'ios-install';
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
    try { if (!(await isSupported())) return 'unsupported'; } catch (e) { return 'unsupported'; }
    if (Notification.permission === 'denied') return 'denied';
    return Notification.permission === 'granted' && remembered() === 'on' ? 'on' : 'off';
}

/** À appeler depuis un clic (la demande d'autorisation exige un geste de l'utilisateur). */
export async function enablePush() {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) throw new Error('no-token');
    remember('on');
    return 'on';
}

export async function disablePush() {
    try { await deleteToken(getMessaging(app)); } catch (e) { /* déjà désinscrit */ }
    remember(null);
    return 'off';
}
