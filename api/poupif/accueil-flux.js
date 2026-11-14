// Accueil spontané après consentement, sans transcription ni audio visiteur.
import { verifierEssai, transmettreFlux, refus } from '../../lib/poupif-bridge.js';
export default async function handler(req,res) {
  if(req.method!=='POST')return refus(req,res,405,'Méthode non autorisée');
  const secret=verifierEssai(req,res);if(!secret)return;
  const {session,visite,presentation,contexte}=req.body||{};
  if(!session||typeof session!=='string')return refus(req,res,400,'Session manquante');
  return transmettreFlux(req,res,'/accueil-flux',{session,visite,presentation,contexte},secret);
}
