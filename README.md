# Dashboard Admin — Déploiement Vercel

## 1. Déployer
Comme la Mini App (Phase 3) : projet statique, aucune build.
1. Pousse ce dossier `admin-dashboard/` dans un **repo Git séparé** (ou un sous-dossier,
   mais déploie-le comme un **projet Vercel distinct** de la Mini App — deux URLs différentes).
2. Vercel → New Project → Framework Preset **Other**, pas de build command.
3. Recommandé : protège ce projet avec **Vercel Authentication / Password Protection**
   (disponible sur les plans Pro), en plus de la clé API, car c'est un panneau interne.

## 2. Configuration
Dans `index.html`, remplace :
```html
<script>window.__API_BASE_URL__ = 'https://ton-backend.onrender.com';</script>
```
par l'URL de ton backend Render.

Au premier chargement, colle la valeur de `ADMIN_API_KEY` (définie dans les variables
d'environnement Render, Phase 2) — elle est stockée dans le `localStorage` de ton
navigateur uniquement, jamais envoyée ailleurs qu'au backend.

## 3. Ce que couvre ce Dashboard (par rapport à la charte §5)
| Fonctionnalité charte | Statut |
|---|---|
| Templates de contenu (pronostic, bilan, article, kit réseaux) | ✅ |
| Cases à cocher des destinations de publication | ✅ |
| Statistiques verrouillées une fois "Validé"/"Perdu" | ✅ (appliqué au niveau SQL, Phase 1) |
| Bannières flash d'urgence | ✅ |
| Gestion bookmakers / codes promo | ✅ |
| Export Kit TikTok en DM admin | ✅ (géré côté backend, patché en Phase 4) |
| Édition FAQ, logos, liens à la volée | ✅ (onglets Réglages et FAQ) |
| Upload d'images natif | ✅ (Supabase Storage, bucket `public-assets`) |
| Relance panier abandonné + relance VIP expirés | ✅ (CRON automatique + `/winback` manuel) |

## 4bis. Prochaine étape possible
- Tests de bout en bout une fois tes vraies clés API branchées (je n'ai pas
  d'accès réseau sortant pour les exécuter moi-même)
- Vérification de la signature Cryptomus en sandbox avant la prod
- Pages légales (`miniapp/legal/`) : ce sont des **modèles génériques**, à faire
  relire par un juriste local avant publication — voir l'avertissement en tête
  de chaque page
