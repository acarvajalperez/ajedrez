# Ajedrez Frontend

Este es el frontend para la aplicación de Ajedrez, construido con [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) y [Vite](https://vitejs.dev/).

## Requisitos previos

- Node.js (versión 18 o superior recomendada)
- npm o yarn

## Instalación y ejecución

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Configuración de Credenciales OAuth2 (Google Sign-In)

La aplicación utiliza Google Sign-In para la autenticación de usuarios. Para que el inicio de sesión funcione correctamente, debes configurar tus propias credenciales de cliente OAuth 2.0.

### Pasos para actualizar las credenciales:

1. Ve a la consola de Google Cloud (GCP) y crea o selecciona tu proyecto.
2. Navega a **API y Servicios** > **Credenciales**.
3. Crea un ID de cliente de OAuth 2.0 para una **Aplicación web**.
4. Añade los orígenes de JavaScript autorizados (por ejemplo, `http://localhost:5173` para desarrollo local).
5. Copia tu **ID de cliente** (termina en `.apps.googleusercontent.com`).

### Aplicar las credenciales en el código:

1. Abre el archivo principal de la aplicación:
   `src/main.tsx`

2. Busca la constante `GOOGLE_CLIENT_ID` (alrededor de la línea 8):
   ```tsx
   const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; // REEMPLAZAR CON TU CLIENT ID
   ```

3. Reemplaza el valor de la cadena con tu ID de cliente de Google Cloud Console.

4. Guarda el archivo. El servidor de desarrollo recargará automáticamente la aplicación.

## Scripts disponibles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Construye la aplicación para producción.
- `npm run preview`: Sirve localmente la versión de producción previamente construida.
