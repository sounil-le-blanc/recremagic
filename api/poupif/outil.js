// Renvoie au moteur le résultat réel d'un outil exécuté dans la page
// (montrerEtape / piloterPresentation). Même contrôle d'accès que /tour.
import { verifierEssai, transmettre, refus } from '../../lib/poupif-bridge.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return refus(req, res, 405, 'Méthode non autorisée');
  const secret = verifierEssai(req, res);
  if (!secret) return;

  const { session, outil_id, nom, resultat, contexte, visite } = req.body || {};
  if (!session || !outil_id || !nom) return refus(req, res, 400, 'Retour d’outil incomplet');

  const r = await transmettre('/outil', { session, outil_id, nom, resultat, contexte, visite }, secret);
  if (r.erreur) return refus(req, res, r.statut, r.erreur);
  return res.status(r.statut).json(r.donnees);
}
