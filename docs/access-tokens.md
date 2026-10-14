# Jetons d'accès

Un jeton d'accès permet à un serveur, un script ou une CI de lire les variables d'**un seul
environnement** d'un projet, sans compte utilisateur.

## Caractéristiques

- **Lecture seule** : un jeton ne peut ni créer, ni modifier, ni supprimer.
- **Un environnement** : choisi à la création, non modifiable.
- **Durée** : 30 jours, 90 jours, 1 an ou sans expiration.
- **Affiché une seule fois** : copiez-le à la création. Cachkey n'en garde qu'une empreinte ;
  un jeton perdu ne peut pas être retrouvé, seulement remplacé.
- Commence par `ck_`, pour être reconnu par les outils qui détectent les secrets dans le
  code.
- Jusqu'à 50 jetons par projet.

## Créer et révoquer

Paramètres du projet → Jetons d'accès (propriétaires et administrateurs). La liste affiche
le nom, l'environnement, le début du jeton, l'auteur, l'expiration et la dernière
utilisation. La révocation est immédiate.

Chaque lecture des variables par un jeton est notée dans le journal d'activité, au nom du
jeton.

## Utiliser un jeton

Avec la [CLI](cli.md) :

```bash
export CACHKEY_TOKEN=ck_…
export CACHKEY_URL=https://cachkey.example.com
cachkey pull --output .env
cachkey run -- node server.js
```

Avec l'[API publique](api.md) :

```bash
curl -H "Authorization: Bearer $CACHKEY_TOKEN" \
  "https://cachkey.example.com/api/v1/secrets?format=dotenv" > .env
```

Exemple GitHub Actions :

```yaml
- name: Variables de production
  run: curl -fsS -H "Authorization: Bearer ${{ secrets.CACHKEY_TOKEN }}" "$CACHKEY_URL/api/v1/secrets?format=dotenv" > .env
  env:
    CACHKEY_URL: https://cachkey.example.com
```

## Bonnes pratiques

- Un jeton par usage (un serveur, une CI), nommé clairement, pour pouvoir le révoquer seul.
- Préférez une durée limitée et renouvelez-le avant l'expiration ; la vue d'ensemble signale
  les jetons qui expirent bientôt.
- Rangez-le dans le gestionnaire de secrets de votre CI ou de votre hébergeur, jamais dans
  le dépôt.
