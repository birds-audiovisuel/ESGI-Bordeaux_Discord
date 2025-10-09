# 🎓 Bot Discord Campus Éducative Bordeaux

[![Projet Étudiant](https://img.shields.io/badge/Projet-Étudiant%20ESGI-blue)](https://github.com)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2)](https://discord.js.org/)
[![Multi-Server](https://img.shields.io/badge/Multi--Server-✓-green)](https://github.com)
[![MyGES API](https://img.shields.io/badge/MyGES-API%20Integrée-orange)](https://github.com)

> **🎓 Projet étudiant développé par l'ESGI Bordeaux**  
> Bot Discord multi-serveur créé par les étudiants de l'École Supérieure de Génie Informatique pour le campus Éducative Bordeaux, gérant l'authentification obligatoire via MyGES et l'administration automatisée de **plusieurs serveurs Discord** pour les 14 écoles du campus.

## 🔗 Multi-Serveur

**Le bot peut être ajouté à plusieurs serveurs Discord simultanément !**

- ✅ **Base de données partagée** : Un utilisateur authentifié une fois peut rejoindre tous les serveurs
- ✅ **Configuration par serveur** : Chaque serveur a ses propres rôles, salons et permissions  
- ✅ **Gestion centralisée** : Statistiques globales et administration multi-serveur
- ✅ **Déploiement simple** : Un seul bot pour tous vos serveurs campus

## 🏫 Campus Éducative Bordeaux - 14 Écoles

Le bot gère automatiquement les catégories et rôles pour toutes les écoles :

- 🔧 **ESGI** - Informatique, IOT & VR
- 💼 **PPA Business School** - Marketing, Communication, Finance, RH  
- 📈 **EDBS** - Business, Digital & IA
- 🏠 **EFAB** - Immobilier
- 📸 **EFET Photographie** - Photographie
- 🎨 **EFET Studio Créa** - Design et Architecture d'Intérieur
- 💎 **EIML** - Marketing et Management du Luxe
- 🎬 **ESIS** - Cinéma, Son et Musique
- 🎮 **ICAN** - Jeux-vidéo et Web
- 📺 **ISA** - Audiovisuel
- 📰 **ISFJ** - Journalisme
- 🏦 **Maestris BTS** - Banque, Assurance, Comptabilité, Transports
- 👗 **MODART International** - Mode
- ⚽ **PPA Sport** - Management du Sport

## ✨ Fonctionnalités Principales

### 🔐 Authentification MyGES Obligatoire
- **Authentification requise** pour accéder aux serveurs
- **Authentification unique** : Une fois authentifié, accès à tous les serveurs du campus
- Intégration avec l'API MyGES (CurtainShow/API-MyGES)
- Attribution automatique des pseudos : \"Prénom NOM\"
- Rôles automatiques basés sur l'école et le statut (étudiant/enseignant)

### 🏷️ Système de Rôles Automatique
- **Rôles par serveur** : Chaque serveur a ses propres rôles et permissions
- **Rôles système** : Authenticated, Étudiant, Professeur, Modérateur, Administrateur
- **Rôles d'école** : Un rôle par école avec permissions spécifiques  
- **Hiérarchie automatique** des rôles
- **Attribution intelligente** : Même utilisateur, rôles adaptés à chaque serveur

### 🏗️ Structure Serveur Automatisée
- **Catégorie Campus** : Salons communautaires inter-écoles
- **14 catégories d'école** : Chacune avec ses salons spécialisés
- **Salons dynamiques** : Création automatique selon les besoins
- **Permissions granulaires** par école et statut

### 🛡️ Modération Professionnelle
- Commandes de modération complètes (`/moderation`)
- Logs d'activité et d'authentification
- Gestion des avertissements, mutes, kicks, bans
- Interface conviviale mais professionnelle

### 📊 Statistiques Avancées
- Stats générales du serveur (`/stats general`)
- Répartition par école (`/stats ecoles`)
- Statistiques d'authentification (`/stats auth`)
- Activité en temps réel (`/stats activite`)

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+ 
- Python 3.9+ 
- Un bot Discord configuré
- Accès à l'API MyGES

### 1. Installation des dépendances

#### Bot Discord (Node.js)
```bash
npm install
```

#### Service MyGES (Python)
```bash
cd myges-api-service
pip install -r requirements.txt
```

### 2. Configuration

#### Bot Principal
Copiez `.env.example` vers `.env` et configurez :

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id

# Développement uniquement - pour déploiement rapide sur un serveur spécifique  
# En production, laissez vide pour déploiement global multi-serveur
GUILD_ID=

# MyGES API Service
MYGES_API_URL=http://localhost:3001
MYGES_API_KEY=your_secure_api_key

# Database (partagée entre tous les serveurs)
DATABASE_PATH=./data/bot.db

# Bot Owner (pour commandes globales /global)
BOT_OWNER_ID=your_discord_user_id

# Multi-Server Configuration
MAX_SERVERS=100
ENABLE_AUTO_SETUP=false
```

#### Service MyGES API  
Copiez `myges-api-service/.env.example` vers `myges-api-service/.env` :

```env
JWT_SECRET=your_very_secure_jwt_secret
PORT=3001
DEBUG=false
API_KEY=your_secure_api_key
```

### 3. Déploiement des commandes

#### Pour le développement (serveur spécifique)
```bash
# Configurer GUILD_ID dans .env avec l'ID de votre serveur de test
npm run deploy
```

#### Pour la production (global - tous les serveurs)
```bash
# Laisser GUILD_ID vide dans .env  
npm run deploy
# Note: Les commandes globales prennent jusqu'à 1h pour être disponibles
```

### 4. Lancement

#### Démarrage du service MyGES API
```bash
cd myges-api-service
python app.py
```

#### Démarrage du bot Discord  
```bash
npm start
# ou pour le développement
npm run dev
```

## 📋 Commandes Disponibles

### 🔐 Authentification
- `/auth` - S'authentifier avec MyGES (obligatoire, valable sur tous les serveurs)

### 🛠️ Administration  
- `/setup` - Initialiser complètement le serveur (admin uniquement)
- `/admin users [utilisateur]` - Gérer les utilisateurs authentifiés sur ce serveur
- `/admin channels` - Gérer les salons et catégories
- `/admin roles` - Gérer les rôles  
- `/admin stats` - Statistiques détaillées du serveur

### 🌍 Administration Globale (Propriétaire du bot uniquement)
- `/global stats` - Statistiques de tous les serveurs
- `/global servers` - Liste des serveurs connectés

### 🛡️ Modération
- `/moderation warn <utilisateur> <raison>` - Avertir
- `/moderation mute <utilisateur> <durée> [raison]` - Mettre en sourdine
- `/moderation unmute <utilisateur>` - Retirer la sourdine  
- `/moderation kick <utilisateur> [raison]` - Expulser
- `/moderation ban <utilisateur> [raison]` - Bannir
- `/moderation clear <nombre> [utilisateur]` - Supprimer messages

### 📊 Statistiques (par serveur)
- `/stats general` - Statistiques générales du serveur
- `/stats ecoles` - Répartition par école sur ce serveur  
- `/stats auth` - Statistiques d'authentification du serveur
- `/stats activite` - Activité en temps réel du serveur

## 🏗️ Architecture Technique

### Stack Technologique
- **Bot** : Node.js + Discord.js v14 (Multi-serveur)
- **API** : Python + Flask + MyGES API (Service partagé)
- **Database** : SQLite avec tables multi-serveur (production : PostgreSQL recommandé)
- **Auth** : JWT + bcrypt (Authentification unique, accès multiple)

### Structure du Projet
```
ESGI-Bordeaux_Discord/
├── src/
│   ├── commands/          # Commandes slash
│   ├── events/           # Événements Discord  
│   ├── utils/            # Utilitaires (roles, setup)
│   ├── services/         # Services (MyGES API)
│   ├── database/         # Gestion base de données
│   └── config/           # Configuration (écoles, etc.)
├── myges-api-service/    # Service Python MyGES
├── data/                 # Base de données SQLite
└── README.md
```

### Flux d'Authentification Multi-Serveur
1. **Premier serveur** : Nouveau membre rejoint → Message de bienvenue
2. **Authentification** : `/auth` → Modal MyGES → Vérification API → Création profil global
3. **Attribution** : Pseudo + rôles + permissions sur ce serveur  
4. **Autres serveurs** : Même utilisateur rejoint automatiquement authentifié
5. **Rôles adaptatifs** : Mêmes données MyGES, rôles spécifiques à chaque serveur

## 🔒 Sécurité

- **Authentification obligatoire** via MyGES
- **Hashage sécurisé** des identifiants temporaires
- **Tokens JWT** avec expiration  
- **Permissions granulaires** par école
- **Logs d'audit** complets
- **Rate limiting** sur l'API

## 🛠️ Développement

### Structure des Commits
```bash
git commit -m \"feat: add MyGES authentication system\"
git commit -m \"fix: resolve role assignment issue\"  
git commit -m \"docs: update installation guide\"
```

### Tests
```bash
# Tests du service MyGES
cd myges-api-service
python -m pytest tests/

# Tests du bot (à implémenter)
npm test
```

## 📞 Support et Contribution

### Issues et Bugs
Signalez les bugs et demandes de fonctionnalités sur GitHub Issues ou directement via le serveur Discord ESGI.

### Contribution Étudiante
**Le projet est ouvert aux contributions des étudiants du campus !**

1. **Fork le projet** (étudiants ESGI et campus Éducative)
2. **Créer une branche** : `git checkout -b feature/amelioration-esgi`
3. **Développer** : Suivre les standards du projet
4. **Tester** : Valider sur un serveur de test
5. **Pull Request** : Expliquer l'amélioration proposée  

**Idées de contributions étudiantes :**
- 🎨 Interface graphique web d'administration
- 📅 Intégration emploi du temps MyGES  
- 🔔 Système de notifications inter-écoles
- 📊 Tableaux de bord avancés
- 🤝 Fonctionnalités collaboratives projets
- 🎯 Gamification et engagement étudiant

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

## 🎯 Roadmap

### Version Actuelle (1.0.0)
- ✅ Authentification MyGES obligatoire
- ✅ Gestion automatique des 14 écoles
- ✅ Système de rôles et permissions
- ✅ Commandes de modération
- ✅ Statistiques avancées

### Prochaines Versions
- 🔄 **v1.1** : Interface web d'administration multi-serveur
- 🔄 **v1.2** : Système de synchronisation avancé entre serveurs  
- 🔄 **v1.3** : Intégration calendrier MyGES (emploi du temps)
- 🔄 **v1.4** : Notifications cross-serveur et événements campus
- 🔄 **v1.5** : API publique et webhooks pour intégrations

---

## 🤖 Ajouter le Bot à Votre Serveur

### Pour les Administrateurs de Serveur

1. **Inviter le bot** : Utilisez le lien d'invitation avec les permissions nécessaires
2. **Première connexion** : Le bot se présente et explique la configuration  
3. **Configuration** : Un admin lance `/setup` pour initialiser complètement le serveur
4. **Authentification** : Les membres utilisent `/auth` avec leurs identifiants MyGES
5. **Prêt !** : Le serveur est configuré avec les 14 écoles et permissions

### Permissions Requises

Le bot nécessite ces permissions Discord :
- ✅ **Gérer le serveur** (pour la configuration automatique)
- ✅ **Gérer les rôles** (création et attribution automatique)  
- ✅ **Gérer les salons** (création des catégories et salons d'école)
- ✅ **Envoyer des messages** (interactions et notifications)
- ✅ **Gérer les messages** (modération)
- ✅ **Gérer les pseudos** (attribution automatique "Prénom NOM")
- ✅ **Bannir/Expulser** (modération)

### Multi-Campus

Le bot peut gérer plusieurs campus/établissements :
- 🏫 **Campus principal** : Éducative Bordeaux (14 écoles)
- 🏫 **Serveurs satellites** : Classes spécialisées, projets, événements
- 🏫 **Serveurs partenaires** : Collaboration inter-campus

Chaque serveur garde ses spécificités tout en partageant la base d'utilisateurs authentifiés.

---

**🎓 Développé avec ❤️ par les étudiants ESGI Bordeaux**

*Projet étudiant réalisé par les étudiants de l'École Supérieure de Génie Informatique (ESGI) du campus Éducative Bordeaux. Une solution technique créée par et pour la communauté étudiante du campus.*

**👨‍💻 Équipe de développement :**
- Étudiants ESGI Bordeaux - Promotion 2024/2025
- Spécialisation : Informatique, IoT & VR
- Encadrement pédagogique : Corps enseignant ESGI

*Pour toute question technique ou contribution, contactez l'équipe ESGI via le serveur Discord du campus.*