# Usar una imagen oficial de Node.js ligera
FROM node:20-alpine

# Crear y establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de dependencias
COPY package*.json ./

# Instalar las dependencias
RUN npm install

# Copiar el resto del código de la aplicación
COPY . .

# Compilar el frontend (Vite)
RUN npm run build

# Exponer el puerto que usa tu servidor
EXPOSE 3000

# Comando para iniciar tu servidor backend
CMD ["npx", "tsx", "server.ts"]
