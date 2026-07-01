# --- Étape build : Node construit le site (bake CMS + bundle + copie assets) ---
# Node 22 requis : @supabase/supabase-js a besoin d'un WebSocket natif (présent
# dès Node 22 ; Node 20 fait échouer createClient au build).
FROM node:22-alpine AS build
WORKDIR /app

# Deps (package-lock.json est gitignoré dans ce repo → npm install, pas npm ci)
COPY package.json ./
RUN npm install

# Code + build
COPY . .
# Variables injectées par Coolify comme build args (cf. env buildtime)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# --- Étape service : nginx sert le dist/ statique ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
