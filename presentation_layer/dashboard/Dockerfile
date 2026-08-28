# Utiliser une image Node légère
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code source
COPY . .

# Exposer le port par défaut de Vite
EXPOSE 5173

# Lancer l'application en mode développement
CMD ["npm", "run", "dev"]