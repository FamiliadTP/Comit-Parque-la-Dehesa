# Control de Proyectos — Parque la Dehesa

Aplicación web para que la administración y el comité lleven el control de las
tareas y proyectos del edificio. Hecha con React + Vite y conectada a Supabase
(base de datos, acceso y archivos).

## Qué incluye

- Ingreso con correo y contraseña (Google y Face ID se agregan después del despliegue).
- Acceso restringido: solo entran las personas en la lista de autorizados.
- Tabla de tareas con búsqueda y filtros por estado, prioridad, clasificación, estrategia y origen.
- Ficha de cada tarea: editar información, cambiar estado y adjuntar presupuestos/cotizaciones.
- Las tareas no se borran: se pasan al estado **Descartada**.
- **Bitácora** (solo superadmin): quién creó o modificó cada tarea, con el valor anterior y el nuevo.
- **Usuarios** (solo superadmin): administrar la lista de personas autorizadas y sus roles.

## 1) Configurar las llaves

Copia `.env.example` como `.env` y completa con los datos de tu proyecto
(Supabase → Project Settings → API):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_public_key
```

## 2) Probar en tu computador (opcional)

```
npm install
npm run dev
```

Abre la dirección que aparece (normalmente http://localhost:5173) e ingresa con
tu correo y la contraseña que definiste como superadmin.

## 3) Subir a GitHub y publicar en Vercel

1. Sube esta carpeta a un repositorio nuevo en GitHub (no subas `.env` ni `node_modules`; ya están en `.gitignore`).
2. En Vercel, **Add New → Project** e importa el repositorio.
3. Framework preset: **Vite**. Build command `npm run build`, Output `dist` (Vercel lo detecta solo).
4. En **Environment Variables** agrega las dos llaves del paso 1 (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
5. **Deploy**. Al terminar tendrás una dirección tipo `https://control-edificio.vercel.app`.

## 4) Después de publicar (lo vemos juntos)

- En Supabase → Authentication → URL Configuration, pon la dirección de Vercel como **Site URL**.
- Activar **Google** y **passkey (Face ID)**, que necesitan esa dirección para funcionar.
- Configurar un “ping” automático para que el proyecto gratuito no se pause por inactividad.
