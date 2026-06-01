const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

const STORYTELLING = [
  "J'ai attendu 5 ans avant de faire ça...",
  "Le moment où j'ai compris que tout devait changer",
  "Ma plus grande peur était de...",
  "Comment j'ai failli tout perdre (et ce qui s'est passé après)",
  "La personne qui a tout changé pour moi",
  "Ce que personne ne savait de moi à mes débuts",
  "L'échec qui m'a tout donné",
  "Pourquoi j'ai tout abandonné pour recommencer à zéro",
  "La décision qui a changé le cours de ma vie",
  "Ce que mes proches m'ont dit quand j'ai commencé",
  "Mon pire moment (et ce qui m'a sauvée)",
  "La chose dont j'avais le plus honte... et qui est devenue ma force",
  "Ce que je n'ai jamais osé dire publiquement jusqu'à aujourd'hui",
  "L'histoire vraie derrière tout ce que je fais",
  "Il y a X ans, je n'aurais jamais imaginé être là où je suis",
  "La conversation qui a tout changé en 5 minutes",
  "Ce que j'ai dû perdre pour gagner ce que j'ai aujourd'hui",
  "Le jour où j'ai dit non à quelque chose de sécurisant",
  "Mon plus grand regret (et la leçon derrière)",
  "La nuit où j'ai pris la décision de tout changer",
  "Ce que ma famille pensait vraiment de mes rêves",
  "J'ai eu peur de partager ça, mais voici ce qui s'est passé",
  "Il m'a fallu X ans pour comprendre cette vérité simple",
  "La fois où j'ai failli abandonner (pourquoi je ne l'ai pas fait)",
  "Ce moment embarrassant qui m'a appris quelque chose de précieux",
  "L'erreur qui m'a coûté le plus cher dans ma vie",
  "Ce que je ferais différemment si je recommençais aujourd'hui",
  "La surprise la plus inattendue de tout mon parcours",
  "Le message qui m'a brisée... puis complètement reconstruite",
  "Ce que personne ne voit derrière mes réussites",
  "Ce que j'ai sacrifié pour être là où j'en suis",
  "La fois où j'ai pleuré de joie (voici pourquoi)",
  "Mon avant/après en toute honnêteté",
  "Ce moment où j'ai réalisé que j'avais tort sur tout",
  "La leçon que la vie m'a apprise à la dure",
];

const AUTORITE = [
  "3 erreurs que 90% des gens font (et comment les éviter)",
  "Ce que personne ne dit sur (ton domaine)",
  "La vérité derrière (mythe populaire dans ton domaine)",
  "Mes 5 règles non-négociables pour réussir",
  "Pourquoi (approche populaire) ne fonctionne pas vraiment",
  "Le mythe qu'on doit arrêter de croire",
  "Ce que les experts ne te disent pas",
  "Les signes que tu es prêt(e) à passer au niveau suivant",
  "Voici pourquoi tu n'obtiens pas les résultats que tu veux",
  "La différence entre ceux qui réussissent et les autres",
  "Ce que j'aurais aimé savoir avant de commencer",
  "Les 4 étapes que personne ne t'explique clairement",
  "Pourquoi tu dois arrêter de faire (habitude commune)",
  "Ce que signifie vraiment (terme de ton domaine)",
  "La vraie raison pour laquelle la plupart des gens échouent",
  "Les 3 piliers sur lesquels tout repose",
  "Comment savoir si tu fais fausse route",
  "Pourquoi (croyance commune) est une illusion",
  "Ce que personne n'ose dire à voix haute",
  "La question que tu dois te poser avant de commencer",
  "Les 7 signes que tu as besoin de changer d'approche",
  "Ce qui sépare les amateurs des vrais professionnels",
  "Arrête de croire que c'est une question de talent",
  "Le conseil que je donne à tout le monde en premier",
  "Pourquoi la chose la plus simple est souvent la plus efficace",
  "Ce que j'ai appris après des années de (ton expérience)",
  "Les règles non-dites que tu dois connaître",
  "Comment reconnaître quand une opportunité est vraiment bonne",
  "Voici pourquoi la plupart des gens abandonnent trop tôt",
  "Ce que personne ne fait mais tout le monde devrait",
  "Les 5 choses à arrêter immédiatement si tu veux avancer",
  "La vérité que tu ne veux pas entendre (mais dont tu as besoin)",
  "Ce qu'on ne t'apprend jamais sur (sujet important)",
  "Pourquoi plus d'efforts ne donnent pas toujours plus de résultats",
  "Le piège dans lequel tombent 80% des débutants",
];

const EMBODIMENT = [
  "Résultat concret : voici ce qui s'est passé quand j'ai appliqué ça",
  "Avant/Après honnête (sans filtre ni retouche)",
  "Voici ce que j'ai fait aujourd'hui pour avancer vers mon objectif",
  "Un témoignage qui m'a touchée (partagé avec permission)",
  "Mon processus complet (étape par étape)",
  "En coulisses : voici comment je prépare (projet/offre/contenu)",
  "Ce que ça ressemble vraiment de vivre ce que j'enseigne",
  "Une vraie journée dans ma vie (sans filtre)",
  "Voici mes chiffres de ce mois (transparence totale)",
  "Je viens de terminer (projet) (voici ce que j'ai appris)",
  "Mon système que j'utilise chaque semaine (détails complets)",
  "Récap de la semaine : victoires + défis réels",
  "Ce que j'ai accompli en X jours en faisant simplement ça",
  "Ils ont obtenu (résultat) en faisant une seule chose différemment",
  "Mon outil préféré pour (tâche) et comment je l'utilise exactement",
  "Voici à quoi ressemble concrètement (chose que tu enseignes)",
  "La transformation que j'ai vue de mes propres yeux",
  "Ce que mes clients disent après X semaines de travail ensemble",
  "Je te montre exactement comment je fais (processus)",
  "Ma routine quotidienne (honnêteté totale sur ce qui fonctionne)",
  "Les coulisses de la création de (produit/contenu/offre)",
  "Ce que j'ai testé cette semaine (et ce qui a vraiment fonctionné)",
  "Un résultat inattendu que je n'avais pas prévu",
  "Preuve en chiffres : l'avant et l'après côte à côte",
  "Ce qu'on ne voit pas derrière ce post parfait",
  "Voici mon espace de travail / ma journée type en images",
  "La décision concrète que j'ai prise ce mois-ci (et pourquoi)",
  "Retour d'expérience honnête après X mois de (pratique/méthode)",
  "Les 3 actions concrètes que j'ai faites cette semaine",
  "Ce que je construis en ce moment (premier regard)",
  "Un moment de fierté que j'ai envie de célébrer avec toi",
  "Voici exactement ce que j'enseigne (et comment ça se vit)",
  "Mon processus de création (de l'idée au résultat final)",
  "Ce que ça coûte vraiment de vivre ce rêve (honnêteté brute)",
  "La preuve vivante que la constance paie sur le long terme",
];

const TYPES = ['Storytelling', 'Autorité', 'Embodiment'];
const POOLS = [STORYTELLING, AUTORITE, EMBODIMENT];

function getDefaults() {
  const entries = [];
  for (let i = 0; i < 365; i++) {
    const typeIdx = i % 3;
    const poolIdx = Math.floor(i / 3) % POOLS[typeIdx].length;
    entries.push({ jour: i + 1, type: TYPES[typeIdx], hook: POOLS[typeIdx][poolIdx] });
  }
  return entries;
}

const DEFAULTS = getDefaults();

router.get('/', (req, res) => {
  const overrides = db.prepare('SELECT * FROM content_overrides WHERE user_id = ?').all(req.user.id);
  const customMap = {};
  for (const o of overrides) customMap[o.jour] = o;

  const result = DEFAULTS.map(d => ({
    jour: d.jour,
    type: customMap[d.jour]?.type || d.type,
    hook: customMap[d.jour]?.hook || d.hook,
    custom: !!customMap[d.jour],
  }));
  res.json(result);
});

router.put('/:jour', (req, res) => {
  const { type, hook } = req.body;
  const jour = parseInt(req.params.jour);
  if (jour < 1 || jour > 365) return res.status(400).json({ message: 'Jour invalide.' });
  db.prepare(
    `INSERT INTO content_overrides (user_id, jour, type, hook) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, jour) DO UPDATE SET type=excluded.type, hook=excluded.hook`
  ).run(req.user.id, jour, type, hook);
  res.json({ jour, type, hook, custom: true });
});

router.delete('/:jour', (req, res) => {
  db.prepare('DELETE FROM content_overrides WHERE user_id = ? AND jour = ?').run(req.user.id, parseInt(req.params.jour));
  res.json({ success: true });
});

module.exports = router;
