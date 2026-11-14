// Crée la conversation Mac et une session signée sans saisie de code.
// Essai sans code autorisé, borné par FIN_ESSAI et les contrôles du moteur.
import { signerJeton, transmettre, refus, essaiOuvert, FIN_ESSAI } from '../../lib/poupif-bridge.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return refus(req, res, 405, 'Méthode non autorisée');
  if (!essaiOuvert()) return refus(req, res, 410, 'Cet essai temporaire est terminé.');
  const secret = process.env.POUPIF_BRIDGE_SECRET;
  if (!secret) return refus(req, res, 503, 'Pont non configuré');
  const { visite, presentation, contexte } = req.body || {};
  const r = await transmettre('/session', { visite, presentation, contexte }, secret);
  if (r.erreur) return refus(req, res, r.statut, r.erreur);
  if (r.statut !== 200) return res.status(r.statut).json(r.donnees);
  if (!r.donnees || typeof r.donnees.session !== 'string')
    return refus(req, res, 502, 'Démarrage incomplet du moteur');
  if (!essaiOuvert()) return refus(req, res, 410, 'Cet essai temporaire est terminé.');
  return res.status(200).json({ ...r.donnees, jeton: signerJeton(secret), expireLe: new Date(FIN_ESSAI).toISOString() });
}
