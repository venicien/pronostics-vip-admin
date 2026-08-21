# Feuille de route juridique et de conformité : Pronostics VIP

**Date :** 20 août 2026
**Projet :** Pronostics VIP (Congo-Brazzaville)
**Auteur :** Manus AI

Ce document présente une analyse factuelle du modèle de Pronostics VIP et identifie les points d'attention réglementaires. Il est conçu pour être soumis à un conseiller juridique local (avocat ou juriste au Congo-Brazzaville) afin d'obtenir un avis formel avant de poursuivre le développement technique et commercial du service.

## 1. Cadre réglementaire et modèle du service

La République du Congo a adopté le 11 octobre 2024 la **Loi n° 37-2024 portant réglementation des jeux de hasard et d'argent** [1]. Cette loi encadre strictement le secteur, notamment les paris sportifs, en instaurant des régimes de monopole public, d'agrément et d'autorisation d'exploitation [2].

Cependant, **Pronostics VIP n'est pas un opérateur de jeux de hasard**. Le service :
- Ne prend aucun pari et ne fixe pas de cotes contractuelles.
- Ne détient pas les fonds destinés aux mises des joueurs.
- Vend un service d'information et d'analyse sportive (les Pass VIP) via un modèle d'abonnement.
- Génère des revenus complémentaires par l'affiliation commerciale vers des bookmakers tiers.

### Risque de requalification
Le principal risque juridique pour Pronostics VIP est la requalification de son activité. Si la frontière entre le conseil (fourni par la Mini App) et la prise de pari (fournie par le bookmaker) devient ambiguë, le service pourrait être considéré comme un intermédiaire illicite ou un opérateur clandestin. Le maintien d'une stricte séparation entre l'abonnement VIP et les mises de jeu est donc impératif.

## 2. Matrice des actions de conformité et points à valider

Le tableau ci-dessous récapitule les mesures déjà implémentées dans la Mini App et le dashboard Admin, ainsi que les questions précises à soumettre à un professionnel du droit.

| Domaine | Actions déjà implémentées dans l'application | Points à valider avec un avocat local |
| :--- | :--- | :--- |
| **Jeu responsable et mineurs** | Ajout d'une case à cocher obligatoire confirmant la majorité légale avant tout paiement. Intégration d'un bandeau préventif ("Jouer comporte des risques") permanent en bas de la Mini App. | Une simple déclaration sur l'honneur (case à cocher) est-elle suffisante pour un service de *conseil* en paris sportifs, ou la loi congolaise exige-t-elle une vérification d'identité formelle (KYC) ? |
| **Pratiques commerciales** | Interdiction stricte des mentions "gain garanti". Affichage transparent des résultats (Gagné, Perdu). Ajout d'une checklist de conformité éditoriale dans le dashboard Admin avant chaque publication. | Le format d'affichage des bilans et des taux de réussite respecte-t-il les règles de protection des consommateurs et de publicité au Congo ? |
| **Paiements et flux financiers** | Maintien d'un modèle de paiement strictement manuel (Mobile Money, Crypto). Aucune passerelle de prélèvement automatique. Les CGU précisent la nature de l'achat (abonnement numérique). | L'encaissement direct de cryptomonnaies pour des abonnements numériques nécessite-t-il une déclaration spécifique auprès de la BEAC ou des autorités fiscales congolaises ? |
| **Affiliation (Bookmakers)** | Les CGU précisent que Pronostics VIP n'est pas responsable des plateformes tierces vers lesquelles pointent les liens d'affiliation. | La loi n° 37-2024 interdit-elle de faire la promotion (affiliation) de bookmakers internationaux qui ne disposeraient pas d'un agrément spécifique au Congo ? |

## 3. Recommandations opérationnelles

Avant de reprendre le développement technique (notamment l'intégration de nouvelles fonctionnalités d'engagement ou de monétisation), il est recommandé d'appliquer les mesures conservatoires suivantes :

1. **Geler la création de nouveaux partenariats d'affiliation** tant que le statut des bookmakers promus n'a pas été vérifié au regard de la nouvelle législation congolaise de 2024.
2. **Maintenir l'architecture de paiement manuel** actuelle. L'intégration de passerelles de paiement automatisées (surtout en crypto) augmenterait considérablement les obligations de conformité (lutte contre le blanchiment d'argent) et le risque d'être assimilé à une plateforme financière.
3. **Conserver la traçabilité des validations Admin**. Le fait que chaque paiement soit validé manuellement par un administrateur démontre un contrôle humain sur les accès, ce qui est un argument favorable en cas de contrôle réglementaire.

---

## Références

[1] Ministère de l'Économie et des Finances de la République du Congo, "Loi n° 37-2024 du 11 octobre 2024 portant réglementation des jeux de hasard et d'argent", 11 octobre 2024. [https://www.finances.gouv.cg/fr/loi-n°-37-2024-du-11-octobre-2024-portant-réglementation-des-jeux-de-hasard-et-d’argent](https://www.finances.gouv.cg/fr/loi-n%C2%B0-37-2024-du-11-octobre-2024-portant-r%C3%A9glementation-des-jeux-de-hasard-et-d%E2%80%99argent)

[2] Agence d'Information d'Afrique Centrale (ADIAC), "Jeux du hasard : une loi en préparation pour règlementer le secteur", 3 août 2024. [https://www.adiac-congo.com/content/jeux-du-hasard-une-loi-en-preparation-pour-reglementer-le-secteur-158903](https://www.adiac-congo.com/content/jeux-du-hasard-une-loi-en-preparation-pour-reglementer-le-secteur-158903)
