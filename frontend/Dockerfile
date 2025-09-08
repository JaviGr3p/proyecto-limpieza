# ---- Stage 1: Build de React ----
FROM node:18-alpine AS build

WORKDIR /app

# Copiamos package.json y lock para aprovechar cache
COPY package*.json ./
# Si usas yarn: COPY yarn.lock ./

# Instalamos dependencias
RUN npm ci --silent || npm install --silent

# Copiamos todo el código fuente
COPY . .

# Construimos la app
RUN npm run build

# ---- Stage 2: Nginx para servir estáticos ----
FROM nginx:stable-alpine

# Copiamos los archivos compilados
COPY --from=build /app/build /usr/share/nginx/html

# Copiamos configuración custom de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponemos el puerto HTTP
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]