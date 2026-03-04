# Usar una imagen oficial de Node.js ligera
FROM node:20-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de configuración de dependencias
COPY package*.json ./

# Instalar las dependencias (incluyendo las de desarrollo para compilar el frontend)
RUN npm install

# Copiar el resto del código de la aplicación
COPY . .

# Compilar el frontend (Vite)
RUN npm run build

# Crear un directorio para la base de datos y darle permisos
# Esto es importante para mapear el volumen en Docker y no perder datos
RUN mkdir -p /app/data && chown -R node:node /app/data

# Exponer el puerto que usa el servidor
EXPOSE 3000

# Comando para iniciar el servidor en producción
# Usamos tsx para ejecutar el servidor TypeScript directamente
CMD ["npx", "tsx", "server.ts"]
