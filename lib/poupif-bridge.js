// Pont Poupif : vérification du jeton d'essai et transfert vers le moteur du Mac
// via le tunnel Cloudflare. Aucun secret n'est exposé au navigateur.
//
// Variables d'environnement Vercel attendues :
//   POUPIF_BRIDGE_SECRET   secret partagé avec le moteur local (en-tête X-Poupif-Secret)
//   POUPIF_TUNNEL_URL      URL du Quick Tunnel, ex. https://xxx.trycloudflare.com
//   POUPIF_TRIAL_CODE_HASH sha256 hexadécimal du code d'essai
//   POUPIF_TRIAL_MINUTES   durée de validité du jeton (défaut 45)

import crypto from 'node:crypto';

export const DUREE_MIN = Number(process.env.POUPIF_TRIAL_MINUTES || 45);
// Borne absolue de cet essai : aucun nouveau jeton ne prolonge cette date.
export const FIN_ESSAI = Date.parse('2026-11-14T23:48:18Z');
export function essaiOuvert() { return Date.now() < FIN_ESSAI; }
const TAILLE_MAX_CORPS = 3 * 1024 * 1024; // 3 Mo, sous la limite Vercel de 4,5 Mo

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function depuisB64url(txt) {
  return Buffer.from(txt.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Jeton = base64url(payload).signature — sans état, donc vérifiable partout. */
export function signerJeton(secret) {
  const charge = b64url(JSON.stringify({ exp: Math.min(FIN_ESSAI, Date.now() + DUREE_MIN * 60_000), n: crypto.randomBytes(6).toString('hex') }));
  const sig = b64url(crypto.createHmac('sha256', secret).update(charge).digest());
  return charge + '.' + sig;
}

export function jetonValide(jeton, secret) {
  if (!jeton || typeof jeton !== 'string' || !jeton.includes('.')) return false;
  const [charge, sig] = jeton.split('.');
  if (!charge || !sig) return false;
  const attendu = b64url(crypto.createHmac('sha256', secret).update(charge).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(attendu);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(depuisB64url(charge).toString('utf8'));
    return typeof exp === 'number' && Date.now() < exp;
  } catch {
    return false;
  }
}

export function codeValide(code) {
  if (!essaiOuvert()) return false;
  const attendu = (process.env.POUPIF_TRIAL_CODE_HASH || '').toLowerCase().trim();
  if (!attendu || !code) return false;
  const recu = crypto.createHash('sha256').update(String(code).trim()).digest('hex');
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function refus(req, res, code, message) {
  res.status(code).json({ erreur: message });
}

/** Vérifie le jeton d'essai porté par la requête. */
export function verifierEssai(req, res) {
  if (!essaiOuvert()) {
    refus(req, res, 410, 'Cet essai temporaire est terminé. La visite sans son reste disponible.');
    return null;
  }
  const secret = process.env.POUPIF_BRIDGE_SECRET;
  if (!secret) {
    refus(req, res, 500, 'Pont non configuré');
    return null;
  }
  const entete = req.headers.authorization || '';
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7) : '';
  if (!jetonValide(jeton, secret)) {
    refus(req, res, 401, 'Session d’essai absente ou expirée');
    return null;
  }
  return secret;
}

/** Transfère vers le moteur local, en-tête secret ajouté côté serveur. */
export async function transmettre(chemin, corps, secret, timeoutMs = 60_000) {
  if (!essaiOuvert()) return { erreur: 'Cet essai temporaire est terminé.', statut: 410 };
  const base = (process.env.POUPIF_TUNNEL_URL || '').replace(/\/+$/, '');
  if (!base) return { erreur: 'Tunnel non configuré', statut: 503 };

  const brut = JSON.stringify(corps ?? {});
  if (Buffer.byteLength(brut) > TAILLE_MAX_CORPS) return { erreur: 'Charge trop lourde', statut: 413 };

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), timeoutMs);
  try {
    const r = await fetch(base + chemin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Poupif-Secret': secret },
      body: brut,
      signal: controleur.signal,
    });
    const texte = await r.text();
    let donnees;
    try {
      donnees = JSON.parse(texte);
    } catch {
      return { erreur: 'Réponse illisible du moteur', statut: 502 };
    }
    return { donnees, statut: r.status };
  } catch (e) {
    const expire = e.name === 'AbortError';
    return { erreur: expire ? 'Le moteur n’a pas répondu à temps' : 'Moteur injoignable', statut: 504 };
  } finally {
    clearTimeout(minuteur);
  }
}
