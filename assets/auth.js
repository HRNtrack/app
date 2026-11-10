// HRNtrack — connexion partagée : fenêtre de connexion, email/mot de passe, Google, mot de passe oublié.
import { app } from './firebase.js';
import {
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
    GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export const auth = getAuth(app);

const messages = {
    fr: {
        fill: "Merci de remplir tous les champs.",
        error: "Erreur : ",
        googleError: "Erreur Google : ",
        notVerified: "Votre adresse email n'a pas encore été vérifiée. Veuillez cliquer sur le lien envoyé dans votre boîte mail.",
        created: "Compte créé avec succès ! Un lien de vérification a été envoyé. Veuillez vérifier votre boîte mail (et vos spams) pour valider votre compte avant de vous connecter.",
        resetNeedEmail: "Veuillez entrer votre adresse email dans le champ ci-dessus pour réinitialiser le mot de passe.",
        resetSent: "Email de réinitialisation envoyé ! Vérifiez vos courriers indésirables."
    },
    en: {
        fill: "Please fill in all fields.",
        error: "Error: ",
        googleError: "Google error: ",
        notVerified: "Your email address has not been verified yet. Please click the link sent to your inbox.",
        created: "Account successfully created! A verification link has been sent. Please check your inbox (and spam) to validate your account before logging in.",
        resetNeedEmail: "Please enter your email address in the field above to reset your password.",
        resetSent: "Reset email sent! Check your spam folder."
    }
};

/**
 * Met à jour le bouton « Connexion / Mon compte » de l'en-tête (ordinateur + mobile).
 * Connecté : le bouton mène à compte.html (ou ne fait rien si on y est déjà).
 * Déconnecté : le bouton ouvre la fenêtre de connexion.
 */
export function updateAuthButtons(loggedIn, { onAccountPage = false } = {}) {
    const btn = document.getElementById('auth-trigger');
    const btnMob = document.getElementById('auth-trigger-mob');
    const goToAccount = onAccountPage ? () => {} : () => { window.location.href = "compte.html"; };
    if (btn) {
        btn.classList.toggle('logged-in', loggedIn);
        btn.onclick = loggedIn ? goToAccount : () => window.toggleAuthModal();
    }
    if (btnMob) {
        btnMob.classList.toggle('logged-in', loggedIn);
        btnMob.onclick = loggedIn ? goToAccount : () => { window.toggleAuthModal(); window.toggleMobileMenu(); };
    }
}

/** Affiche « Connexion » ou « Mon compte » selon l'état de connexion. `t` = dictionnaire de la langue courante. */
export function updateAuthLabel(t) {
    const label = auth.currentUser ? t.authAccount : t.authLogin;
    for (const id of ['auth-status-text', 'auth-status-text-mob']) {
        const el = document.getElementById(id);
        if (el) el.innerText = label;
    }
}

/**
 * Ajoute à la fenêtre de connexion ce qu'il faut pour les lecteurs d'écran et le clavier :
 * rôle « dialog », libellés des champs, remplissage automatique, Entrée pour valider,
 * et Tab qui reste à l'intérieur de la fenêtre tant qu'elle est ouverte.
 */
function makeModalAccessible(getLang) {
    const overlay = document.getElementById('auth-modal');
    if (!overlay) return;
    const box = overlay.querySelector('.modal-content') || overlay;
    const title = overlay.querySelector('.auth-title');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    if (title) {
        title.id = title.id || 'auth-modal-title';
        box.setAttribute('aria-labelledby', title.id);
    }
    const email = document.getElementById('auth-email');
    const pass = document.getElementById('auth-pass');
    const fr = () => getLang() !== 'en';
    if (email) { email.setAttribute('autocomplete', 'email'); email.setAttribute('aria-label', 'Email'); }
    if (pass) {
        pass.setAttribute('autocomplete', 'current-password');
        pass.setAttribute('aria-label', fr() ? 'Mot de passe' : 'Password');
        pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.handleLogin(); });
    }
    overlay.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const focusables = [...box.querySelectorAll('button, input, a[href], select, textarea')].filter(el => !el.disabled && el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
}

/**
 * Branche les boutons de la fenêtre de connexion (#auth-modal) sur Firebase.
 * @param {() => string} getLang renvoie la langue courante de la page ('fr' ou 'en')
 */
export function setupAuthModal(getLang) {
    const m = () => messages[getLang()] || messages.fr;
    const field = (id) => document.getElementById(id).value;
    const googleProvider = new GoogleAuthProvider();

    makeModalAccessible(getLang);
    let lastFocus = null;

    // toggleAuthModal() bascule ; toggleAuthModal(true/false) force l'ouverture / la fermeture.
    window.toggleAuthModal = (force) => {
        const el = document.getElementById('auth-modal');
        if (!el) return;
        const open = typeof force === 'boolean' ? force : el.style.display !== 'flex';
        el.style.display = open ? 'flex' : 'none';
        if (open) {
            lastFocus = document.activeElement;
            const email = document.getElementById('auth-email');
            if (email) setTimeout(() => email.focus(), 0);
        } else if (lastFocus && document.contains(lastFocus) && lastFocus.offsetParent !== null) {
            lastFocus.focus();
        }
    };

    window.handleLogin = async () => {
        const email = field('auth-email'), pass = field('auth-pass');
        if (!email || !pass) return alert(m().fill);
        try {
            const cred = await signInWithEmailAndPassword(auth, email, pass);
            if (!cred.user.emailVerified) {
                alert(m().notVerified);
                await signOut(auth);
                return;
            }
            window.toggleAuthModal();
        } catch (e) { alert(m().error + e.message); }
    };

    window.handleRegister = async () => {
        const email = field('auth-email'), pass = field('auth-pass');
        if (!email || !pass) return alert(m().fill);
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            await sendEmailVerification(cred.user);
            alert(m().created);
            await signOut(auth);
            window.toggleAuthModal();
        } catch (e) { alert(m().error + e.message); }
    };

    window.handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            window.toggleAuthModal();
        } catch (e) { alert(m().googleError + e.message); }
    };

    window.handleResetPassword = async () => {
        const email = field('auth-email');
        if (!email) return alert(m().resetNeedEmail);
        try {
            await sendPasswordResetEmail(auth, email);
            alert(m().resetSent);
        } catch (e) { alert(m().error + e.message); }
    };
}
