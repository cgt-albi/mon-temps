# Mon Temps

Appli web gratuite de suivi du temps de travail pour les agents hospitaliers, proposée par la CGT.
Tout reste sur le téléphone de l'agent : pas de compte, pas de serveur, aucune collecte.

Écrite de zéro, à partir des textes officiels (décret n° 2002-9 du 4 janvier 2002).

---

## Modifier le contenu sans toucher au code : Pages CMS

Nom de l'appli, logo, icône, couleur, contacts, réseaux sociaux, actualités, agenda,
codes horaires, règles de calcul : tout se modifie dans des formulaires.

1. Ouvre **https://app.pagescms.org** et connecte-toi avec GitHub.
2. Choisis ce dépôt. Trois rubriques apparaissent :
   - **Appli, logo, contacts et réseaux** (avec les actualités et l'agenda) ;
   - **Codes horaires** ;
   - **Règles de calcul**.
3. Modifie, puis clique sur **Save**. Le site se met à jour tout seul en 2 minutes environ.

Pour le logo ou l'icône : clique sur le champ image, puis sur **Upload** et choisis ton fichier.
L'icône de l'appli (écran d'accueil du téléphone) est fabriquée automatiquement dans toutes les tailles.

Pour un réseau social : colle simplement l'adresse complète de la page (ex. `https://www.facebook.com/…`).
Le bon logo (Facebook, Instagram, WhatsApp, TikTok, YouTube, X, Bluesky, Threads, Telegram) s'affiche tout seul.
Un champ laissé vide n'apparaît pas dans l'appli.

Si une saisie casse quelque chose, la publication s'arrête et **l'ancienne version reste en ligne**.

---

## Mettre à jour les chiffres officiels (SMIC, point d'indice, grilles)

Dans Pages CMS, ouvrir **Barèmes**. Chaque série est une liste datée : pour une revalorisation, **ajouter une ligne** avec sa date d'effet. L'appli prend toujours la dernière ligne dont la date est passée, donc une valeur annoncée peut être saisie à l'avance : elle s'applique toute seule le jour J. Tant que le statut est « Annoncé », l'appli affiche « provisoire ».
Le SMIC du 1er décembre 2026 (environ 12,50 € brut de l'heure, annoncé le 9 novembre) est déjà prévu : il faudra seulement remplacer le montant par celui du décret, et passer le statut sur « Officiel ».

## Vérifier tous les chiffres

Dans l'appli : Réglages › **Vérifier les chiffres de l'appli**. La page liste chaque valeur avec sa source et son statut. Elle s'imprime et s'envoie par mail, pour que les déléguées et délégués puissent tout relire.

## Statistique d'installation (facultative)

Désactivée par défaut. Pour l'activer : créer un compte gratuit sur goatcounter.com, puis saisir son code dans Pages CMS › Appli › **Statistiques d'installation**. L'appli envoie alors, une seule fois par appareil, deux signaux sans aucune donnée : « première ouverture » et « appli installée ». La page Confidentialité de l'appli l'annonce toute seule.

## Publication anonyme (recommandée)

But : que le site public ne mène jamais au compte GitHub personnel de son auteur.

Principe : ce dépôt (le code, les modifications) reste **privé**. À chaque modification, il copie
automatiquement le site terminé dans le dépôt **public** d'un **compte GitHub dédié**, sans historique
ni nom d'auteur. Le public ne voit que ce compte dédié.

### 1. Rendre ce dépôt privé
**Settings** › **General** › tout en bas, **Change repository visibility** › **Make private**.

### 2. Créer le compte dédié
1. Crée une adresse mail neuve, réservée à ça (par ex. sur Proton Mail, gratuit).
2. Déconnecte-toi de GitHub (ou ouvre une fenêtre de navigation privée), puis **Sign up** avec cette adresse.
   Le nom du compte devient l'adresse du site : `nom-du-compte.github.io`.
3. Avec ce compte : **New repository**, nommé exactement `nom-du-compte.github.io`, **Public**,
   coche **Add a README file**, puis **Create repository**.
4. Dans ce dépôt public : **Settings** › **Pages** › *Source* : **Deploy from a branch**, branche **main**, dossier **/ (root)** › **Save**.

### 3. Donner au dépôt privé le droit de publier
1. Toujours connecté avec le compte dédié : photo en haut à droite › **Settings** › **Developer settings**
   › **Personal access tokens** › **Fine-grained tokens** › **Generate new token**.
2. Nom : `publication`. Expiration : la plus longue proposée. *Repository access* : **Only select repositories**
   › le dépôt `nom-du-compte.github.io`. *Permissions* › **Contents** : **Read and write**.
3. **Generate token**, puis copie le jeton affiché (il ne sera plus jamais montré).
4. Reconnecte-toi avec ton compte habituel. Dans **ce** dépôt privé : **Settings** › **Secrets and variables** › **Actions** :
   - onglet **Secrets** › **New repository secret** : nom `PUBLICATION_TOKEN`, valeur = le jeton copié ;
   - onglet **Variables** › **New repository variable** : nom `DEPOT_PUBLIC`, valeur = `nom-du-compte/nom-du-compte.github.io`.
5. Onglet **Actions** › **Publier le site** › **Run workflow**. Le site apparaît sur `https://nom-du-compte.github.io`.

GitHub prévient par mail avant l'expiration du jeton : il suffit alors d'en créer un nouveau et de remplacer le secret.

### Nom de domaine (facultatif)
Pour une adresse du type `montemps.fr` : l'acheter au nom du syndicat (environ 8 à 10 € par an pour un `.fr`),
puis le renseigner dans Pages CMS (champ *Nom de domaine*) et chez le vendeur du domaine,
suivre la page d'aide « Managing a custom domain for your GitHub Pages site ».

---

## Organisation

- `index.html`, `accueil.*` : page d'accueil
- `app/` : l'appli (planning, compteurs, preuves, syndicat, réglages, sauvegarde, transfert par QR code, visite guidée)
- `app/moteur.js` : calculs et contrôles légaux, testés à chaque publication (`scripts/tester.mjs`)
- `config/contenu.json`, `config/codes.json`, `config/regles.json` : tout le contenu modifiable (via Pages CMS)
- `images/` : logos et images envoyés depuis Pages CMS
- `.pages.yml` : les formulaires de Pages CMS

Licence MIT. Police Archivo (SIL OFL 1.1). Bibliothèques : qrcode-generator (MIT), jsQR (Apache 2.0),
icônes Simple Icons (CC0).
