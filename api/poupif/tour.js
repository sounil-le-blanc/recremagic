// Transmet un tour de parole au moteur Poupif (Mac) via le tunnel.
// Refuse toute requête sans jeton d'essai valide, avant toute opération facturée.
import { verifierEssai, transmettre, refus } from '../../lib/poupif-bridge.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return refus(req, res, 405, 'Méthode non autorisée');
  const secret = verifierEssai(req, res);
  if (!secret) return;

  const { session, mime, audio, visite, presentation, contexte } = req.body || {};
  if (!audio || typeof audio !== 'string') return refus(req, res, 400, 'Audio manquant');
  if (audio.length > 2_600_000) return refus(req, res, 413, 'Enregistrement trop long');

  const r = await transmettre('/tour', { session, mime, audio, visite, presentation, contexte }, secret);
  if (r.erreur) return refus(req, res, r.statut, r.erreur);
  return res.status(r.statut).json(r.donnees);
}
