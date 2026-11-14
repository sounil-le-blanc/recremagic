import { verifierEssai, transmettreFlux, refus } from '../../lib/poupif-bridge.js';
export default async function handler(req,res) {
  if(req.method!=='POST')return refus(req,res,405,'Méthode non autorisée');
  const secret=verifierEssai(req,res);if(!secret)return;
  const {session,outil_id,nom,resultat,contexte,visite}=req.body||{};
  if(!session||!outil_id||!nom)return refus(req,res,400,'Retour d’outil incomplet');
  return transmettreFlux(req,res,'/outil-flux',{session,outil_id,nom,resultat,contexte,visite},secret);
}
