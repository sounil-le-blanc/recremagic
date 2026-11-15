import {verifierEssai,transmettreFlux,refus} from '../../lib/poupif-bridge.js';
export default async function handler(req,res){
 if(req.method!=='POST')return refus(req,res,405,'Méthode non autorisée');
 const secret=verifierEssai(req,res);if(!secret)return;
 const {session,evenement,visite,presentation,contexte}=req.body||{};
 if(!session||typeof session!=='string'||!evenement||typeof evenement.id!=='string'||evenement.id.length>120)return refus(req,res,400,'Session ou événement manquant');
 if(!['etape_trajet','arrivee_scene','poursuivre_presentation'].includes(evenement.type))return refus(req,res,400,'Événement inconnu');
 if(!['roulotte','atelier','petite_scene'].includes(evenement.etape))return refus(req,res,400,'Étape inconnue');
 return transmettreFlux(req,res,'/conduite-flux',{session,evenement,visite,presentation,contexte},secret);
}
