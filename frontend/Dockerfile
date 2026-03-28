# Etapa 1: Build de React
FROM node:20-alpine AS build
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código y empaquetar para Producción usando Vite
COPY . .
RUN npm run build

# Etapa 2: Servidor Web Estático (Nginx) Ultra Rápido
FROM nginx:alpine

# Copiar la carpeta compilada (dist) al directorio público de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Por seguridad, y para soportar single-page-applications:
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Iniciar Daemon
CMD ["nginx", "-g", "daemon off;"]
