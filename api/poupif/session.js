// Ouvre une session d'essai Poupif contre le code temporaire.
// Le code n'est jamais validé côté navigateur : seul le hash serveur compte.
import { codeValide, signerJeton, refus, DUREE_MIN } from '../../lib/poupif-bridge.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return refus(req, res, 405, 'Méthode non autorisée');
  const secret = process.env.POUPIF_BRIDGE_SECRET;
  if (!secret) return refus(req, res, 500, 'Pont non configuré');

  const { code } = req.body || {};
  if (!codeValide(code)) return refus(req, res, 401, 'Code d’essai refusé');

  return res.status(200).json({
    jeton: signerJeton(secret),
    expireDansMin: DUREE_MIN,
    bornes: { tours: 40, secondesParPrise: 15, minutesDeSession: DUREE_MIN },
  });
}
