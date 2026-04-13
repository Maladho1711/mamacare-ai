# MamaCare AI — Product Requirements Document (PRD)

Version 1.0 — Avril 2026
Auteur : Mamadou Maladho Barry — ImprOOve

---

## 1. Vision & Contexte

### Problème
La mortalité maternelle en Guinée est causée par 3 retards critiques :
1. Retard dans la décision de consulter (méconnaissance des signes de danger)
2. Retard dans l'accès au centre de santé (distance, coût)
3. Retard dans l'administration des soins (surcharge du personnel)

### Solution MamaCare AI
PWA qui permet :
- Aux patientes : remplir un questionnaire quotidien de symptômes + alertes personnalisées
- Aux médecins : surveiller leurs patientes à distance via dashboard en temps réel
- À l'agent IA : analyser les symptômes selon protocoles OMS + déclencher les alertes

**Objectif MVP :** Réduire le premier retard en donnant aux femmes une interprétation
immédiate de leurs symptômes et en alertant proactivement le médecin.

---

## 2. Utilisateurs (Personas)

### Patiente — Aïssatou, 28 ans, Labé
- Enceinte de 6 mois, premier enfant
- Téléphone Android entrée de gamme, 4G limité
- Niveau de français fonctionnel, utilise WhatsApp quotidiennement
- Compte créé par son médecin au centre de santé
- Besoin : savoir si ses symptômes sont normaux, rappels consultations et vaccins

### Médecin — Dr. Diallo, gynécologue, Labé
- Suit 40 à 80 patientes simultanément
- Débordé, pas le temps de rappeler chaque patiente
- Besoin : être alerté uniquement pour les urgences, vue consolidée des patientes à risque

### Hors périmètre MVP
- Sages-femmes (V2)
- Agents de santé communautaires (V2)
- Familles des patientes (V3)

---

## 3. Fonctionnalités MVP

### Module Patiente

#### F01 — Onboarding
- Le médecin crée le profil de la patiente (nom, numéro, date grossesse, terme prévu)
- La patiente reçoit un SMS avec lien d'accès à la PWA
- Connexion : OTP SMS (pas de mot de passe)

#### F02 — Questionnaire quotidien
- Notification push PWA chaque matin (défaut 8h, configurable)
- 10 à 15 questions max — voir Section 5 pour le détail complet
- Format : choix multiples + quelques champs texte courts
- Durée cible : moins de 3 minutes
- Si non rempli avant 10h → rappel automatique

#### F03 — Résultat immédiat
- Après soumission : résultat en 3 niveaux
  - Vert : "Tout va bien, continuez à prendre soin de vous"
  - Orange : "À surveiller, appelez votre médecin si ça empire"
  - Rouge : "Urgence, contactez votre médecin maintenant"
- Message d'explication simple en français (généré par Claude API)

#### F04 — Historique patiente
- Vue calendrier des questionnaires passés
- Courbe d'évolution des symptômes
- Rappels consultations et vaccinations à venir

### Module Médecin (Dashboard)

#### F05 — Liste des patientes
- Vue tableau triée par niveau de risque (rouge en haut)
- Colonnes : Nom, Semaine grossesse, Dernier questionnaire, Niveau de risque
- Filtres : par risque, par date, par questionnaire manqué

#### F06 — Fiche patiente
- Historique complet des questionnaires
- Graphique évolution symptômes 30 jours
- Résumé généré par Claude des derniers symptômes
- Bouton appel WhatsApp direct

#### F07 — Alertes en temps réel
- Notification push PWA immédiate pour alerte rouge
- Message WhatsApp automatique au médecin avec résumé symptôme
- SMS fallback si WhatsApp non délivré dans 5 minutes
- Log de toutes les alertes dans Supabase

#### F08 — Gestion des patientes
- Créer / modifier / désactiver un profil patiente
- Ajouter notes médicales manuelles
- Marquer une alerte comme traitée

---

## 4. Architecture technique résumée

Voir `@docs/ARCHITECTURE.md` pour le détail complet.

```
Next.js PWA (Vercel)
    ↓ HTTPS
NestJS API (Render)
    ├── Supabase (PostgreSQL + Auth + Realtime)
    ├── Claude API Haiku 4.5 (messages explicatifs)
    ├── WhatsApp Business API (alertes primaires)
    └── Africa's Talking (SMS fallback)
```

**Coût estimé MVP (~100 patientes) : 12 à 18 $/mois**

---

## 5. Questionnaires & Règles Médicales OMS

### Principe de sécurité CRITIQUE
Les règles d'alerte rouge et orange sont STATIQUES (code NestJS — `who-rules.service.ts`).
Claude API génère uniquement les messages explicatifs, JAMAIS les décisions médicales.

---

### Questionnaire Grossesse — Questions Quotidiennes

#### Bloc 1 — Signes vitaux (tous trimestres)

| # | Question | Réponses | Alerte si |
|---|----------|----------|-----------|
| Q1 | Avez-vous des maux de tête inhabituels aujourd'hui ? | Oui / Un peu / Non | Oui + Q2=Oui → ROUGE |
| Q2 | Voyez-vous des points lumineux ou avez-vous la vue brouillée ? | Oui / Non | Oui → ROUGE (prééclampsie) |
| Q3 | Avez-vous des douleurs au ventre ? Si oui, intensité ? | Non / Légère / Forte / Très forte | Forte ou Très forte → ROUGE |
| Q4 | Avez-vous des saignements vaginaux aujourd'hui ? | Oui / Non | Oui → ROUGE immédiat |
| Q5 | Avez-vous de la fièvre (chaleur, frissons) ? | Oui / Non | Oui → ORANGE |
| Q6 | Votre visage, mains ou pieds sont-ils gonflés ? | Oui (beaucoup) / Un peu / Non | Oui beaucoup → ORANGE |

#### Bloc 2 — Mouvements bébé (2e et 3e trimestre uniquement)

| # | Question | Réponses | Alerte si |
|---|----------|----------|-----------|
| Q7 | Avez-vous ressenti des mouvements du bébé aujourd'hui ? | Beaucoup / Moins qu'avant / Pas du tout | Pas du tout → ROUGE / Moins → ORANGE |

#### Bloc 3 — Bien-être général (tous trimestres)

| # | Question | Réponses | Alerte si |
|---|----------|----------|-----------|
| Q8 | Comment vous sentez-vous globalement ? | Bien / Moyen / Mal | Mal → ORANGE |
| Q9 | Avez-vous pris vos suppléments (fer, acide folique) ? | Oui / Non / Je n'en ai plus | Je n'en ai plus → Info médecin |
| Q10 | Avez-vous bu suffisamment d'eau ? | Oui / Non | Non 3 jours consécutifs → ORANGE |
| Q11 | Avez-vous des difficultés à respirer normalement ? | Oui / Non | Oui → ORANGE |

#### Bloc 4 — Santé mentale (hebdomadaire — vendredi uniquement)

| # | Question | Réponses | Alerte si |
|---|----------|----------|-----------|
| Q12 | Vous êtes-vous souvent sentie triste ou anxieuse cette semaine ? | Souvent / Parfois / Non | Souvent → ORANGE + info médecin |
| Q13 | Avez-vous eu des pensées négatives sur vous ou votre grossesse ? | Oui / Non | Oui → ORANGE + ressources soutien |

---

### Questionnaire Post-Natal — Nouveau-né (J1 à J28)

| # | Question | Réponses | Alerte si |
|---|----------|----------|-----------|
| N1 | Votre bébé tète-t-il correctement ? | Oui / Difficulté / Non | Non → ROUGE / Difficulté → ORANGE |
| N2 | Le nombril a-t-il une rougeur ou un écoulement ? | Oui / Non | Oui → ORANGE |
| N3 | Votre bébé est-il chaud au toucher (fièvre possible) ? | Oui / Non | Oui → ROUGE (sepsis) |
| N4 | Votre bébé a-t-il des difficultés à respirer ? | Oui / Non | Oui → ROUGE immédiat |
| N5 | Votre bébé a-t-il une jaunisse (peau ou yeux jaunes) ? | Oui / Non | Oui J1-J3 → ROUGE |
| N6 | Avez-vous allaité votre bébé dans les 6 dernières heures ? | Oui / Non | Non → ORANGE |

---

### Tableau des niveaux d'alerte

| Niveau | Définition | Action système |
|--------|-----------|----------------|
| ROUGE | Signe de danger absolu (prééclampsie, hémorragie, sepsis, détresse fœtale) | WhatsApp médecin immédiat + SMS fallback |
| ORANGE | Symptôme préoccupant à surveiller dans 24h | Notification push médecin + info patiente |
| VERT | Aucun signe d'alerte | Enregistrement + message encourageant |

---

## 6. Modèle de données résumé

Voir `@docs/DATABASE.md` pour le SQL complet.

Tables principales :
- `profiles` — extension de Supabase Auth (role: doctor | patient)
- `patients` — profil patiente créé par le médecin
- `questionnaire_responses` — réponses + analyse IA + niveau alerte
- `alerts` — alertes avec statut WhatsApp, SMS, résolution
- `notification_logs` — audit trail complet de toutes les notifications

---

## 7. Flux applicatifs clés

### Flux patiente — Questionnaire quotidien
1. 8h00 → Notification push
2. Patiente ouvre la PWA → questionnaire affiché
3. Remplit en moins de 3 minutes
4. NestJS applique les règles OMS statiques
5. Si rouge/orange → alerte déclenchée AVANT appel Claude
6. Claude génère le message explicatif
7. Résultat affiché à la patiente
8. Si rouge → WhatsApp médecin immédiat

### Flux médecin — Réception alerte
1. Alerte rouge détectée
2. Supabase Realtime → dashboard mis à jour en temps réel
3. Notification push PWA au médecin
4. WhatsApp : résumé du symptôme urgent
5. SMS fallback si WhatsApp non délivré en 5 min
6. Médecin ouvre la fiche patiente → détail complet

### Flux onboarding patiente
1. Médecin → "Ajouter patiente" → remplit le formulaire
2. Supabase Auth → création compte
3. SMS automatique à la patiente avec lien d'accès
4. Patiente clique → OTP SMS → connectée
5. Premier questionnaire disponible immédiatement

---

## 8. Roadmap

| Phase | Durée | Contenu | Objectif |
|-------|-------|---------|----------|
| MVP | 6-8 semaines | Questionnaire + Dashboard + Alertes + Auth OTP | 50 patientes pilote à Labé |
| V2 | 4 semaines | Multilinguisme Pular, sages-femmes, auto-tension | 200 patientes, 3 centres |
| V3 | 6 semaines | Intégration DHIS2, analytics, agent santé communautaire | Scalabilité nationale |
| V4 | À définir | Téléconsultation, ML stratification risque, Telegram | Partenariats ONG / Ministère |

### Critères de succès MVP

| Indicateur | Cible | Mesure |
|-----------|-------|--------|
| Taux complétion questionnaire quotidien | > 70% | Supabase analytics |
| Délai alerte rouge → médecin notifié | < 2 minutes | Logs NestJS |
| Satisfaction patientes | > 80% satisfaites | Questionnaire hebdo |
| Consultations ANC supplémentaires | +20% vs groupe témoin | Données centre santé |
