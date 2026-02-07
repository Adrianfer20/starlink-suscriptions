# Roadmap: Autenticación y Autorización (roles `admin` / `client`)

Este documento describe la planificación y pasos para introducir manejo de autenticación y autorización por roles en el proyecto. El objetivo es implementar la funcionalidad de forma segura, testeable y con posibilidad de rollback.

**Resumen**
- Objetivo: Añadir `authenticate` (verificación de token Firebase) y `requireRole` (autorización) y proteger endpoints críticos.
- Roles: `admin` y `client`.
- Enfoque: integración gradual, cobertura de tests y despliegue con feature flag.

**Fases (alto nivel)**
1. Preparar rama de trabajo: `feature/auth-roles`.
2. Añadir middleware `authenticate` que valide Firebase ID tokens y exponga `req.user`.
3. Añadir middleware `requireRole(roles)` para comprobar roles permitidos.
4. Fase piloto: proteger rutas de `clients` (solo `admin` para creaciones/listados; `client` con ownership donde proceda).
5. Implementar verificación de ownership en `clients` (si `client`, sólo acceso a sus recursos).
6. Proteger rutas de `notifications` e `inbox` (empezar por `admin` solamente; evaluar permisos adicionales después).
7. Tests: unitarios para middlewares, integración para rutas protegidas y flujos principales.
8. CI/CD: añadir job que ejecute tests y lint; añadir feature flag en configuración para habilitar/deshabilitar auth en runtime.
9. Documentación: actualizar `docs/` (incluir tokens de prueba para tests, ejemplos de uso y guías de migración).
10. Despliegue progresivo: habilitar en staging, monitoreo y rollout a producción; tener plan de rollback.

**Cambios de código esperados**
- `src/middleware/auth.ts` — `authenticate(req,res,next)`:
  - Verifica token (`Authorization: Bearer <token>`), extrae `uid` y `customClaims.role`.
  - Añade `req.user = { uid, role, ...claims }`.
  - Modo `test`: aceptar tokens `test-<role>` para facilitar tests locales/CI.
- `src/middleware/requireRole.ts` — `requireRole(['admin'|'client'])`:
  - Devuelve 401 si no autenticado, 403 si rol no permitido.
- `src/middleware/index.ts` — exportar los middlewares para importación centralizada.
- `src/modules/clients/client.routes.ts` — proteger rutas (fase piloto):
  - `POST /clients` → `authenticate` + `requireRole('admin')` (o permitir self-registration con validación adicional).
  - `GET /clients` → `admin`.
  - `GET /clients/:id` & `PUT /clients/:id` → `admin` o `client` (ownership validado en controller si `client`).
- `src/modules/clients/client.controller.ts` — (ownership opcional) verificar `req.user.uid` antes de permitir operaciones cuando el caller es `client`.
- `src/modules/notifications/notification.routes.ts` y `src/modules/inbox/*` — proteger endpoints administrativos inicialmente.

**Tests**
- Unitarios:
  - `src/middleware/__tests__/auth.test.ts`: casos token válido/inválido, test-mode tokens.
  - `src/middleware/__tests__/requireRole.test.ts`: roles permitidos/no permitidos.
- Integración:
  - Actualizar `src/__tests__/*` para incluir `Authorization` en requests que ya estén protegidas en la fase piloto.
  - Nuevos tests para rutas protegidas (`clients`, `notifications`) asegurando 200/401/403 según corresponda.

**CI / Feature flag**
- Añadir variable de entorno `FEATURE_AUTH_ROLES=true|false`.
  - Por defecto `false` en `main`; habilitar primero en branch/staging.
  - Middlewares deben comprobar la flag y comportarse como noop cuando está desactivada.
- Pipeline: `install` → `build` → `lint` → `test`.

**Migración y rollout**
1. Implementar en rama `feature/auth-roles` con commits pequeños y tests verdes.
2. Abrir PR con descripción y checklist (tests, docs, feature-flag, rollback).
3. Habilitar en staging mediante `FEATURE_AUTH_ROLES=true`, ejecutar pruebas manuales y monitorizar logs/errores.
4. Rollout gradual en producción (canary) si todo está estable.

**Rollback plan**
- Si hay errores críticos, desactivar `FEATURE_AUTH_ROLES` para volver al comportamiento anterior inmediatamente.
- Mantener revert PR listo si la desactivación no soluciona el problema.

**Consideraciones adicionales**
- Roles en Firebase: preferir `customClaims.role` para rendimiento (evitar lecturas en Firestore por request). Si se usa Firestore, implementar caching.
- Seguridad: no exponer información sensible en errores; normalizar respuestas de error.
- Tests: usar tokens de prueba (`test-admin`, `test-client`) en entorno `NODE_ENV=test`.

---

Si confirmas, creo la rama `feature/auth-roles` y empiezo con la Fase 2 (añadir middleware `authenticate`) en commits pequeños y tests asociados. ¿Procedo con la rama? 
