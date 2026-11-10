# Frontend de Entre Uñas

Interfaz Angular y TypeScript. Esta carpeta es autónoma: se puede instalar, probar y publicar sin copiar el código del backend.

## Comandos dentro de frontend

```powershell
npm ci
npm start
```

`npm start` abre automáticamente el navegador en http://localhost:4200. No necesitas volver a instalar en cada inicio.

- `npm run build`: genera `dist/frontend/browser`.
- `npm run test:ci`: ejecuta las pruebas una vez.
- `npm test`: abre el modo de pruebas del proyecto.

## Organización

- `src/app/pages/`: agenda, formulario de citas, clientas, perfil, notificaciones, galería, registro de diseño y reportes. Cada pantalla tiene su HTML, CSS y TypeScript.
- `src/app/shared/`: iconos reutilizables.
- `src/app/pages/catalogs/`: administra los servicios y manicuristas de la base de datos.
- `src/app/core/config/connection.ts`: URL pública de la API. Nunca claves de Atlas.
- `src/app/core/services/agenda.service.ts`: comunicación con API o almacenamiento local.
- `src/app/core/models/`: datos, validación para el formulario y funcionamiento de la demostración local.
- `src/styles.css`: tema compartido.
- `src/app/app.*`: estructura y navegación general.

El backend tiene sus propias reglas obligatorias en `backend/src/domain/`; no importa archivos de esta carpeta. La validación del navegador mejora la experiencia, pero el servidor vuelve a validar las escrituras. Si cambian las reglas de negocio, actualiza y comprueba ambas implementaciones.

## Conexión y publicación

Con API_URL vacío la demostración funciona en el navegador. Con `http://localhost:3000/api` usa el backend, que debe estar iniciado y permitir el origen de Angular.

En Vercel elige esta carpeta como Root Directory, `npm run build` como construcción y `dist/frontend/browser` como salida. Se incluye `vercel.json`.

La guía completa y las limitaciones están en el README de la raíz y `docs/ESTRUCTURA_PANTALLAS.md`.
