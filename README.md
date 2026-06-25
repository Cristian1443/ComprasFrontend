# Portal Compras y Contratación — Frontend

Aplicación React + TypeScript + Vite para el portal de compras y contratación de **Invest in Bogotá**.

## Stack

| Tecnología | Versión |
|---|---|
| React | 18 |
| TypeScript | 5 |
| Vite | 6 |
| Tailwind CSS | 4 |
| Radix UI | — |
| Azure MSAL | 5 |

## Requisitos

- Node.js ≥ 18
- El backend corriendo en `http://localhost:3001` (ver [compras-contratacion-backend](../compras-contratacion-backend))

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# → Editar .env.local con los valores reales

# 3. Iniciar servidor de desarrollo
npm run dev
# → Abre http://localhost:3000
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Build de producción en `build/` |
| `npm run preview` | Previsualizar el build localmente |
| `npm run lint` | Verificar tipos TypeScript |

## Estructura

```
src/
├── components/
│   ├── ui/              # Biblioteca de componentes (Radix + Tailwind)
│   ├── supervisor/      # Módulo Supervisor / Solicitante
│   ├── gerente/         # Módulo Gerente
│   ├── financiera/      # Módulo Financiera
│   ├── juridica/        # Módulo Jurídica
│   ├── secretaria/      # Módulo Secretaría / Comité
│   ├── administrador/   # Módulo Administrador
│   └── publico/         # Módulo Público (proponentes externos)
├── lib/
│   ├── useAuthSync.ts   # Hook de sincronización Azure AD
│   └── graphService.ts  # Microsoft Graph API
├── authConfig.ts        # Configuración MSAL
├── App.tsx
└── main.tsx
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base del backend |
| `VITE_SUPERVISION_GROUP_ID` | ID del grupo de supervisores en Azure AD |
| `ADOBE_CLIENT_ID` | Client ID de Adobe Acrobat Sign |
| `ADOBE_CLIENT_SECRET` | Secret de Adobe Acrobat Sign |
| `ADOBE_REDIRECT_URI` | URI de redirección OAuth de Adobe Sign |
| `ADOBE_SIGN_BASE_URL` | URL base de la API de Adobe Sign |

## Despliegue

El build genera archivos estáticos en `build/`. Se puede servir con cualquier CDN o servidor estático (Nginx, Vercel, Azure Static Web Apps, etc.).

```bash
npm run build
# Servir la carpeta build/
```

> En producción, configurar el servidor para redirigir todas las rutas a `index.html` (SPA routing).
