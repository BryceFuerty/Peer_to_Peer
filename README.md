# Peer_to_Peer (Skeep)

Application d'appel vidéo en Peer-to-Peer (P2P) réalisée dans le cadre du module Web Services.
Ce projet permet de créer des salons de discussion vidéo et de rejoindre des salons existants en temps réel.

## Membres du projet

- Bryce FUERTES
- Baptiste BESSON
- Hippolyte LACOUR
- Lucas STRAPUTICARI

## Fonctionnalités

- **Création de Room** : Génération d'un identifiant unique pour chaque salon.
- **Liste des Rooms actives** : Affichage en temps réel des salons disponibles sur la page d'accueil.
- **Appel Vidéo P2P** : Communication vidéo et audio directe entre les utilisateurs via WebRTC (PeerJS).
- **Gestion des participants** : Connexion et déconnexion gérées dynamiquement.

## Stack Technique

- **Backend** : Node.js, Express
- **Temps Réel** : Socket.io
- **P2P / WebRTC** : PeerJS
- **Frontend** : HTML5, CSS3, JavaScript (ES6 Modules)

## Installation et Démarrage

1. **Cloner le dépôt**

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Lancer le serveur**
   
   Pour le développement (avec redémarrage automatique) :
   ```bash
   npm run dev
   ```
   
   Pour la production :
   ```bash
   npm start
   ```

4. **Accéder à l'application**
   Ouvrez votre navigateur et allez sur `http://localhost:3000` (ou le port configuré).

## Structure du Projet

```
├── public/
│   ├── js/
│   │   ├── controllers/  # Logique de contrôle des pages
│   │   ├── services/     # Services (Socket, Peer, Video)
│   │   ├── app.js        # Point d'entrée Room
│   │   └── homeApp.js    # Point d'entrée Home
│   ├── home.html         # Page d'accueil
│   └── room.html         # Page de visioconférence
├── server.js             # Serveur Express & Socket.io
└── package.json
```
