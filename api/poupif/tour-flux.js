import { verifierEssai, transmettreFlux, refus } from '../../lib/poupif-bridge.js';
export default async function handler(req,res) {
  if(req.method!=='POST')return refus(req,res,405,'Méthode non autorisée');
  const secret=verifierEssai(req,res);if(!secret)return;
  const {session,mime,audio,visite,presentation,contexte}=req.body||{};
  if(!session||!audio||typeof audio!=='string')return refus(req,res,400,'Session ou audio manquant');
  if(audio.length>2600000)return refus(req,res,413,'Enregistrement trop long');
  return transmettreFlux(req,res,'/tour-flux',{session,mime,audio,visite,presentation,contexte},secret);
}
