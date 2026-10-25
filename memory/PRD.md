# PRD — Cultora (Plataforma inteligente de gestión cultural)

## Problem statement (original)
Una app web que actúa como consultor y copiloto estratégico para artistas, colectivos y organizaciones culturales, traduciendo objetivos prácticos en diagnósticos, recomendaciones y planes de acción personalizados.

## Personas
- **Primario**: artistas individuales y pequeños colectivos culturales.
- **Secundario**: compañías, espacios culturales y organizaciones culturales pequeñas o medianas.
- **Futuro**: instituciones públicas, redes culturales, consultores.

## Core static requirements
- Registro e inicio de sesión.
- Perfil del agente cultural (tipo, disciplina, etapa, territorio, recursos).
- Captura de objetivo (catálogo + texto libre).
- Diagnóstico conversacional guiado (preguntas adaptativas por objetivo).
- Motor de decisión especializado (reglas + IA + base documental).
- Plan de acción personalizado (situación, causas, prioridades, tareas, indicadores).
- Seguimiento de tareas (estados + notas + progreso).
- Base de conocimiento cultural (10 categorías).
- Historial de diagnósticos y planes.
- Panel resumen con próximos pasos.

## Tech stack (implementado)
- **Frontend**: React 19 (JS), react-router-dom v7, TailwindCSS + shadcn/ui, phosphor-icons, sonner.
- **Backend**: FastAPI, motor (Mongo async), emergentintegrations (LlmChat), pyjwt, bcrypt.
- **DB**: MongoDB.
- **IA**: GPT-5.2 vía Emergent Universal Key.

## Iteración 1 (2026-02-08) — MVP funcional
### Implementado
- Autenticación JWT (register/login/me).
- Perfil cultural editable (9 campos).
- Catálogo de 6 objetivos con árbol de preguntas.
- Diagnóstico conversacional secuencial (guarda respuestas, avanza índice).
- Motor de decisión: reglas por objetivo + plantillas de plan + IA para narrativa.
- Generación de plan (situación, lectura estratégica, causas, prioridades, tareas, indicadores, docs relacionados).
- Seguimiento de tareas: cambiar estado (pending/in_progress/done), añadir notas, log de progreso.
- Biblioteca de conocimiento (10 documentos seed + filtro por categoría + detalle con markdown ligero).
- Dashboard con métricas globales + próximas acciones + planes recientes.
- Diseño editorial "boutique consultor cultural" (Cormorant + Manrope + IBM Plex Mono, alabaster+obsidian+terracotta).

## Backlog (siguientes iteraciones)
- **P0**: streaming SSE del LLM para narrativa del plan; re-diagnóstico ligero cuando cambia contexto.
- **P1**: Resend/SendGrid para emails de recordatorio; export PDF del plan.
- **P1**: Object storage para plantillas/anexos + panel admin de KB.
- **P2**: recomendador de convocatorias, benchmarks, asistente WhatsApp (Twilio).
- **P2**: multi-idioma; multi-país.

## Success metrics
- % completación de diagnósticos.
- Tiempo hasta primer plan.
- % planes ejecutados parcialmente.
- Tasa de retorno al seguimiento.

## Next tasks
- Correr testing subagent para validación end-to-end.
- Ajustes de UI según feedback del usuario.

## Phase 8 — Panel Administrativo (Feb 2026)
- Módulo `/admin` con arquitectura escalable tipo Linear/Vercel/Notion/Stripe.
- **RBAC granular**: catálogo de permisos por recurso.acción; 4 roles system (superadmin, admin, moderator, content_editor) editables.
- **10 secciones**: Dashboard, Usuarios, Agentes, Foro, Convocatorias, Recursos, Espacios, Analíticas, Configuración, Actividad.
- **Dark/Light mode** con variables CSS aisladas (`--a-*`) y toggle en header.
- **Eliminación lógica** en todos los modelos (`deleted_at`).
- **Bitácora automática** (`admin_activity` collection) para acciones administrativas.
- **Confirmaciones** para acciones destructivas (suspender, bloquear, eliminar, archivar).
- **Sidebar filtrado por permisos**: cada rol ve solo lo que puede.
- **Superadmin**: admin@cultora.net (contraseña comprometida, pendiente de rotar). maria@example.com es usuaria común (contraseña restablecida en jun 2026, ver test_credentials.md).
- 2026-06: Arreglado bug de serialización de ObjectId en POST /api/forum/topics/{id}/replies.
- Tests: 25/25 backend + 11/11 frontend ✅.

## Backlog Priorizado
- P1: Módulo IA operacional (health check, detección de spam, sugerencias) — arquitectura ya preparada.
- P1: Gestión de reportes y suspensión de participación en foro (endpoints listos, UI pendiente).
- P2: Donaciones funcionales con Stripe (actualmente UI mockup).
- P2: Importaciones automáticas de convocatorias (estructura ya soporta `source_url`).
- P2: Upload de archivos con Object Storage (adjuntos en recursos/espacios).
- P3: Asistente de WhatsApp vía Twilio.

## Phase 9 — Sprint de mejoras del Panel Admin (Feb 2026)
Aplicadas 5 de las 6 mejoras propuestas (Sprint 3 diferido como P2).

### Sprint 1 — UX signature
- **Command Palette (⌘K/Ctrl+K)**: overlay con búsqueda global debounced (220ms) sobre 6 colecciones. Navegación + acciones. Endpoint `/api/admin/search?q=`.
- **Detail Drawers**: click en fila abre panel lateral premium con datos completos, historial y acciones. Implementado en Users, Agents, Forum, Convocatorias.
- **URL Filters + Paginación server-side**: hook `useUrlFilters` sincroniza filtros con URL (shareables, sobreviven refresh). Backend devuelve `{items, total, page, limit, has_more}`. Componente `Pagination.jsx` en el footer de todas las tablas.

### Sprint 2 — Extensibilidad + Seguridad
- **Gestión de Roles UI** (`/admin/configuracion/roles`): grilla de roles system + custom. Editor con permisos por módulo, "seleccionar todos", duplicar, eliminar. Colección `admin_roles` en Mongo. Snapshot pattern: al asignar rol custom, se persisten permisos en el usuario; al actualizar rol, se re-sincronizan todos los usuarios (`users_synced`).
- **Overrides de permisos por usuario**: desde el DetailDrawer se puede personalizar permisos individualmente encima del rol. Endpoint `PUT /admin/users/{uid}/permissions`.
- **Session Invalidation**: `get_current_user` rechaza tokens de usuarios suspendidos/bloqueados con 403 (global, no solo admin panel).
- **Índices Mongo**: 25+ índices creados en startup sobre queries calientes (users.email, admin_activity.at, convocatorias.status, forum_topics.category, etc.).

### Sprint 3 — Diferido a P2
- Refactor de `server.py` (~1200 líneas) en routers modulares (`routers/auth.py`, `routers/agents.py`, etc.). Decisión de arquitecto: valor operativo alto pero cero valor de usuario y riesgo de regresión no despreciable en 6 módulos ya validados. Se abordará cuando el volumen de features requiera dividir el archivo o cuando se sume otro dev al proyecto.

### Tests
- iteration_5.json: 23/23 backend + 11/11 frontend ✅

## Phase 10 — Módulo Notificaciones (Feb 2026)
Centro de notificaciones internas integrado al panel admin.

### Diseño clave
- **RBAC natural**: cada notificación tiene un `required_perm`. Los usuarios solo ven las que su rol permite. Sin lógica de suscripción paralela.
- **Idempotencia** por `(kind, target_type, target_id)`: el mismo evento nunca genera duplicados.
- **Eliminación lógica por usuario** (`dismissed_by`, `read_by`): las notifs son compartidas; cada admin marca su estado individual.
- **Auto-refresh con cachet 60s** — sin cron, se ejecuta en cada `GET /notifications`.
- **Polling frontend cada 45s** para actualizar badge sin interacción del usuario.

### Fuentes iniciales
- `agent.pending` → `agents.approve` (nuevos agentes esperando aprobación)
- `convocatoria.expiring` → `convocatorias.edit` (cierran en <7 días)
- `forum.reported` → `forum.handle_reports` (reportes abiertos)
- `users.recent_registrations` → `users.view` (agregado diario de nuevos usuarios)

### UI
- Campana en el header con badge dinámico
- Popover con tabs "Todas / No leídas", empty states elegantes
- Cada item: icono según kind, punto acentuado si no-leída, timestamp relativo ("hace 2m"), hover para descartar
- Click en notif → navega + marca leída
- "Marcar todas como leídas" en footer del popover

### Tests
- iteration_6.json: 12/12 backend + 13/13 frontend ✅

### Backlog
- P2: Background task en vez de refresh inline (evita picos de latencia cuando TTL expira).
- P2: Fuentes adicionales (rol asignado a un usuario, nueva convocatoria publicada, etc.).
- P3: Preferencias por usuario (silenciar un `kind`, email digest diario).

## Phase 11 — Motor de decisión editable (RAG + Reglas + Simulador)
Interfaz completa dentro de `/admin/motor` para nutrir el motor sin código.

### Arquitectura
- **RAG con TF-IDF** (scikit-learn) — provider-agnostic, sin dependencias externas ni API keys.
  Chunks de 350 palabras con solapamiento 40, índice en memoria versionado (`admin_config._kb_version`).
- **Reglas editables**: primer edit sobre un goal migra automáticamente las reglas system de `taxonomy.py` a `motor_rules` en Mongo. A partir de allí son 100% editables.
- **Simulador**: pipeline completo (reglas → RAG → prompt LLM) contra un caso ficticio, sin generar plan real.
- **Integración**: `_build_plan()` de `server.py` ahora inyecta los top-5 chunks al system prompt de GPT-5.2. La IA cita `[Fuente N]` cuando corresponde.
- **Fallback de recall**: si el filtro por goal_key/disciplina devuelve 0 chunks, reintenta sin filtros marcando `fallback:true`.

### Módulos frontend
- `/admin/motor` (hub pedagógico)
- `/admin/motor/biblioteca` (CRUD con drag & drop, metric cards, chunks preview, autoridad)
- `/admin/motor/reglas` (tabs por objetivo, editor visual si-entonces, condiciones por pregunta)
- `/admin/motor/simulador` (respuestas de prueba → resultado con reglas disparadas, priorities, RAG results, prompt debug)

### RBAC — 8 permisos nuevos
- `engine.kb.view/create/edit/delete/authorize`
- `engine.rules.view/edit`
- `engine.simulate`

### Tests
- iteration_7.json: 20/20 backend + 100% frontend ✅
- Bug crítico encontrado y arreglado por testing agent (`has_perm` no definido en 2 endpoints).

### Backlog
- P2: OpenAI embeddings via key propio del cliente (mejor recall que TF-IDF en corpus grandes).
- P2: Parser de PDF/DOCX para upload directo (hoy solo texto plano y URL).
- P3: A/B testing entre versiones del motor (comparar 2 configuraciones lado a lado).

## Phase 12 — Separación de perfiles admin ↔ usuarios
Refactor de identidades por profesionalismo y claridad operativa.

### Cambios
- **Cuenta admin dedicada** (creada por el bootstrap seguro con variables de entorno) — solo panel admin, sin perfil público, no aparece en directorio de agentes.
- **Maria vuelve a ser usuaria común** — se le revoca `admin_role` automáticamente en el seed (idempotente).
- **Redirect inteligente en login**: `is_admin` → `/admin`, resto → `/dashboard` (o `/perfil` si incompleto).
- **`UserPublic` ahora expone `admin_role` e `is_admin`** para que el frontend decida el flujo sin llamadas extra.
- **`PublicOnly`** también respeta el redirect al panel para admins.
- Dominio en uso: `cultora.net`.

### Testing
- Ambas cuentas verificadas manualmente. Login apunta correctamente según rol.


## Phase 13 — Widget "Estado del motor" + Perfil admin (2026-07-11)
Cierre de las dos tareas pendientes del mensaje anterior del usuario.

### Implementado
- **Widget "Estado del motor de decisión"** en `/admin` (AdminDashboard). Solo visible con al menos un permiso `engine.*`.
  - Health score 0-100 con anillo animado y etiqueta ("Excelente/Bien/Mejorable/Insuficiente")
  - 4 mini-stats clickeables: docs publicados · autoritativos · reglas activas · simulaciones 7d
  - Cobertura por objetivo (docs + reglas por goal_key, con badge "default" si usa reglas del sistema)
  - Alertas accionables con CTA directo (biblioteca vacía, docs<6, sin autoritativos, objetivos sin docs, sin simulaciones)
- **`/admin/perfil` (AdminProfile)** — perfil del administrador con:
  - Panel de información (nombre, email, rol, permisos, estado)
  - Form de cambio de contraseña con validación en cliente + medidor de fortaleza (5 niveles)
  - Toast + confirmación visual tras cambio exitoso
- **Menú "Mi cuenta"** del header ahora apunta a `/admin/perfil` (antes iba a `/perfil` público).

### Backend
- `GET /api/admin/motor/status` — snapshot: `health{score,label,tone}` + `kb{...}` + `rules{by_goal[]}` + `activity{simulations_7d,...}` + `alerts[]`. Usa `_require()` para validar admin activo (no bloqueado) + intersección con `engine.*`.
- `POST /api/admin/me/change-password` — valida contraseña actual (bcrypt), `new_password` ≥ 8, distinta de la actual. Registra en bitácora `admin.password_changed`.

### Tests
- iteration_8.json: 7/7 backend pytest + 14/14 frontend Playwright ✅ sin issues.
- Round-trip de cambio de contraseña validado (cambio + login + revert).

### Backlog (post-iteración)
- P1: Refactor de `/app/backend/server.py` en routers modulares (auth, agents, forum, convocatorias, diagnostics).
- P1: Donaciones funcionales vía Stripe (hoy `/apoyar` es mockup UI).
- P2: Retry manual en el widget si falla la carga (hoy queda en estado de error hasta refresh).
- P2: Warn/block del form de contraseña si strength < 2.
- P3: Alerta por email cuando el health score cae por debajo de 40.

## Phase 14 — Adjuntar archivos + idioma + persistencia (2026-07-11)

### Implementado
- **Upload multi-archivo** en biblioteca (`KBFileUploader`): PDF · DOCX · TXT · MD, hasta 5 archivos × 10 MB c/u, con drop zone, spinner y preview por archivo.
- **Extracción server-side**: pypdf (PDF), python-docx (DOCX), decoding con fallback (TXT/MD).
- **Detección automática de idioma** por archivo con `langdetect` (determinista, seed=42): devuelve `{code, label, flag, confidence}`. Se propaga al documento (`language` en Mongo).
- **Object Storage (Emergent-managed)** para persistir originales:
  - Módulo `/app/backend/storage.py` con `init_storage/put_bytes/get_object`, refresh automático en 403, y prefijo `cultora/kb/{user_id}/{uuid}.{ext}`.
  - Init al startup del server (`server.py:on_startup`).
  - Fields nuevos en `knowledge_documents`: `language`, `original_files[]` con `{name, extension, size_bytes, chars, language, storage_path, uploaded_at}`.
- **Descarga protegida** `GET /api/admin/motor/kb/files/download?path=` — solo admins, 404 si el path no está referenciado por un doc existente (evita enumeración).
- UI adicional en el drawer:
  - Chip de idioma por archivo (`🇪🇸 es`) con confianza en tooltip.
  - Sección "Archivos originales guardados" con botón **Descargar** (blob download via fetch + Authorization header) y **quitar referencia**.

### Backend
- `POST /api/admin/motor/kb/extract-files` ahora devuelve `language`, `storage_path`, `uploaded_at` por archivo + `storage_enabled` en la respuesta.
- `KBDocIn` acepta `language` y `original_files[]`.

### Dependencias nuevas
- `pypdf==6.14.2`, `python-docx==1.2.0`, `langdetect==1.0.9`, `fpdf2` (solo para tests).

### Testing
- E2E validado con curl: extracción de 3 archivos (ES + EN + PDF), storage upload, guardado en doc, descarga desde storage, delete de doc.
- Screenshot verificado: chips de idioma visibles con badges `es` y `en`.

### Notas técnicas
- Object Storage no tiene DELETE API → los archivos huérfanos (subidos pero no guardados) quedan almacenados. Aceptable dado el volumen esperado.
- No hay presigned URLs → toda descarga pasa por backend (proxy con Authorization).
- Language detection: mínimo 40 chars, muestra los primeros 4000 para eficiencia.

### Backlog remanente
- P2: OCR con Tesseract para PDFs escaneados (hoy devuelven 0 chars).
- P2: Soporte `.pptx` (para decks de casos).
- P3: Mostrar chip de idioma en la lista principal de documentos (columna nueva).
- P3: Filtro por idioma en la biblioteca (útil cuando el corpus sea multilingüe).


## Phase 15 — Bootstrap seguro del primer superadministrador (2026-07-11)

Se eliminó por completo la lógica insegura de creación del primer superadmin.

### Comportamiento anterior eliminado
- `admin_seed.py` contenía email `admin@cultora.net` y password `cultora-admin-2026` hardcoded.
- Cada arranque re-fijaba `admin_role="superadmin"` y `status="active"` sobre esa cuenta, anulando cambios administrativos legítimos.
- También modificaba automáticamente a `maria@example.com` en cada arranque.

### Nuevo flujo (`admin_bootstrap.py`)
1. Sin `CULTORA_BOOTSTRAP_ENABLED=true` → no toca nada relacionado con cuentas.
2. Con bootstrap habilitado y sin superadmin previo → crea uno con `must_change_password=true`, registra en bitácora como `system.bootstrap_admin_created`.
3. Con superadmin existente o email en uso → warning + skip.
4. Con configuración inválida (variables faltantes, email mal formado, password débil <12 chars/sin mayús/minús/dígito/símbolo) → `RuntimeError` que impide el arranque.
5. La contraseña nunca aparece en logs ni en respuestas.

### Gating por `must_change_password`
- `get_current_user` acepta `Request` y bloquea todos los endpoints excepto `/api/auth/me` y `/api/auth/change-initial-password` mientras el flag esté activo.
- Devuelve HTTP 403 con `detail = {code: "password_change_required", message: ...}`.
- Frontend intercepta el 403 vía axios y redirige a `/cambiar-password-inicial`.
- `Protected`, `PublicOnly` y `AdminLayout` también hacen guard preventivo.

### Nueva ruta y página
- `/cambiar-password-inicial` — `InitialPasswordChange.jsx`, formulario con validación de fortaleza en cliente y reglas visibles (12+ chars, mayús/minús, dígito, símbolo, distinto de la temporal).
- `POST /api/auth/change-initial-password` — valida contraseña actual (bcrypt), fortaleza y desiguladad; setea `must_change_password=false` y registra `password.initial_changed` en bitácora si el usuario es admin.

### Archivos modificados
- **Nuevos**: `/app/backend/admin_bootstrap.py`, `/app/backend/tests/test_admin_bootstrap.py`, `/app/backend/tests/test_must_change_password_gating.py`, `/app/frontend/src/pages/InitialPasswordChange.jsx`.
- **Reescritos**: `/app/backend/admin_seed.py` (sin lógica de cuentas), `/app/memory/test_credentials.md` (documentación de bootstrap, sin credenciales en texto plano).
- **Modificados**: `/app/backend/server.py` (Request en get_current_user, allowlist, endpoint change-initial-password, wiring bootstrap), `/app/frontend/src/App.js` (ruta + guards), `/app/frontend/src/lib/api.js` (interceptor 403), `/app/frontend/src/components/admin/AdminLayout.jsx` (guard).
- **Eliminados**: `/app/backend/tests/test_admin_motor_status_and_password.py` (contenía credenciales comprometidas).
- **PRD actualizado**.

### Variables de entorno nuevas
- `CULTORA_BOOTSTRAP_ENABLED` (`"true"` para habilitar bootstrap; cualquier otro valor = deshabilitado).
- `CULTORA_BOOTSTRAP_ADMIN_EMAIL` (email del primer superadmin).
- `CULTORA_BOOTSTRAP_ADMIN_PASSWORD` (password inicial; se descarta tras la creación).

Tras el primer arranque exitoso: eliminar las 3 variables del entorno.

### Testing
- 14 tests unitarios en `test_admin_bootstrap.py` cubren casos A-H y J (deshabilitado, creación, no-reactivación, no-repromoción, existente, variables faltantes, password no en logs, sin lógica Maria).
- 15 tests de integración en `test_must_change_password_gating.py` (Testing agent, iteration 10) validan el gate HTTP en múltiples endpoints, todas las validaciones del endpoint change-initial-password, y el flujo frontend end-to-end.
- **Total: 29/29 pytest passing + frontend E2E validado**.

### Migración requerida para cuentas existentes
- La cuenta `admin@cultora.net` creada por la versión anterior sigue existiendo en la BD con la contraseña original comprometida.
- Acciones sugeridas (documentadas en `test_credentials.md`):
  - Rotar la contraseña vía `/admin/perfil → cambiar contraseña`, o
  - Eliminarla y crear un superadmin nuevo con el bootstrap seguro.
- El sistema **no restablece** esa cuenta en cada arranque (la lógica insegura fue removida).


## Phase 16 — Endurecimiento integral de seguridad (Fase A) (2026-07-11)

### Alcance entregado
Fase A del hardening: sesiones, autorización, protección superadmin, hardening de entorno.
Fase B (recuperación por correo, verificación de email, 2FA) queda para la próxima iteración con scaffolding preparado.

### Archivos creados
- `/app/backend/security_lib.py` — utilidades: validación JWT_SECRET, política de contraseñas (admin/user), rate limiter sliding-window, session_version helpers, anonimización de IP/UA.
- `/app/backend/migrations.py` — migraciones idempotentes (session_version, integridad de permisos, roles huérfanos).
- `/app/backend/tests/test_security_hardening.py` — 30 tests unitarios + integración.

### Archivos modificados
- `/app/backend/server.py`: JWT_SECRET obligatorio + validación por env, `sv` en JWT, `get_current_user` con detección de `session_expired`/`session_revoked`, `/auth/logout`, `/auth/logout-all`, rate limit en login/register/change-init, política de contraseñas en register, CORS restrictivo por env (falla en prod si es `*`), middleware de security headers (CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options), auditoría estructurada con IP anonimizada + UA resumido, `change-initial-password` ahora bumpea sv y devuelve JWT nuevo.
- `/app/backend/admin_router.py`: protección de superadmin (no dejar cero activos, sólo super promueve super, no auto-modificar rol/status), validación estricta de permisos (rechazo explícito de desconocidos, no otorgar perms que el actor no posee), bump automático de `session_version` en cambio de rol/perms/status/edición de rol custom, endpoint `GET /rbac/integrity` de diagnóstico, `change-own-password` con política admin (12+) + rotación de sv + emisión de JWT nuevo.
- `/app/frontend/src/lib/api.js`: interceptor unificado — reemplazo automático de token cuando el backend rota (respuestas con `data.token`); manejo de `session_expired`/`session_revoked`/`invalid_token`/`account_blocked`/`account_suspended` con redirect apropiado.
- `/app/frontend/src/lib/auth-context.js`: método `logoutAll` que llama al endpoint.
- `/app/frontend/src/pages/admin/AdminProfile.jsx`: sección "Sesiones activas" con botón "Cerrar en todos los dispositivos".
- `/app/backend/tests/test_must_change_password_gating.py`: actualizado para el nuevo comportamiento (rotación de token tras cambio inicial).

### Decisiones arquitectónicas
- **Session versioning en Mongo, sin refresh tokens ni cookies HttpOnly**: se mantuvo el modelo JWT actual (según spec), pero encapsulado detrás de helpers reutilizables (`bump_session_version`, `make_token`). Migrar a cookies HttpOnly + refresh tokens requiere refactor amplio del frontend — queda como Fase C.
- **Rate limit en memoria (SlidingWindowRateLimiter)**: suficiente para MVP monoréplica. Escalado horizontal requerirá migrar a Redis (documentado en el módulo).
- **RBAC — snapshot pattern reforzado**: se mantuvo el snapshot en `users.admin_permissions` (rápido, no requiere query por request), pero ahora cada edición de rol custom bumpea `session_version` de los usuarios afectados → sus JWT quedan revocados hasta re-login → sin deriva efectiva de perms en sesiones activas.
- **Auditoría con IP anonimizada + UA resumido**: cumple con la exigencia de no filtrar identificadores completos.

### Endpoints creados/modificados
- **Nuevos**: `POST /api/auth/logout`, `POST /api/auth/logout-all`, `GET /api/admin/rbac/integrity`.
- **Modificados**: `POST /api/auth/register` (rate limit + policy), `POST /api/auth/login` (rate limit + auditoría estructurada + `sv` en JWT), `POST /api/auth/change-initial-password` (rate limit + rotación de token + audit), `PUT /api/admin/users/{uid}/role` (protección superadmin + sv bump), `PUT /api/admin/users/{uid}/status` (protección + sv bump), `POST /api/admin/rbac/roles` (rechazo unknown perms + límite privilegios), `PUT /api/admin/rbac/roles/{key}` (idem + sv bump masivo), `PUT /api/admin/users/{uid}/permissions` (idem + sv bump), `POST /api/admin/me/change-password` (política + rotación de token).

### Variables de entorno nuevas / requeridas
- `CULTORA_ENV` — `development` | `staging` | `production`. Controla exigencia de JWT_SECRET fuerte y de CORS explícito.
- `JWT_SECRET` — obligatorio, mínimo 32 chars en production/staging.
- `CORS_ORIGINS` — obligatorio en production/staging (lista blanca separada por comas; `*` no permitido).
- `CULTORA_EXTRA_BLOCKED_PASSWORDS` — opcional, lista adicional de contraseñas prohibidas separada por comas.

### Migraciones creadas y ejecutadas
- `2026_07_11_session_version` — asigna `session_version=1` a usuarios sin el campo. Ejecutada al arranque, idempotente.
- `2026_07_11_perm_integrity` — limpia permisos obsoletos de overrides y roles custom (según catálogo actual).
- `2026_07_11_role_integrity` — sólo diagnóstico: detecta usuarios con roles inexistentes (log de warning si los hay).

**Impacto en la sesión existente**: todos los usuarios ya tienen `session_version=1`. Sus JWT emitidos antes del deploy no incluían `sv`, por lo que quedan revocados. **Todos los usuarios deben volver a iniciar sesión.**

### Matriz de roles/permisos
Sin cambios en el catálogo (definido en `admin_permissions.py`): 4 roles system (`superadmin`, `admin`, `moderator`, `content_editor`) + roles custom en `admin_roles`. Cambios funcionales:
- Custom roles ahora rechazan perms desconocidos con error 400 explícito.
- Sólo superadmin puede otorgar perms que no posee él mismo (privilege escalation prevention).
- Edición de rol custom bumpea `session_version` de todos los usuarios afectados.

### Pruebas realizadas y resultados
- Test suites: `test_security_hardening.py` (30) + `test_admin_bootstrap.py` (14) + `test_must_change_password_gating.py` (15, actualizado).
- **Resultado: 62/62 tests passing** (13.7s).
- Verificación curl E2E: rotación de JWT tras cambio de contraseña ✅, logout-all revoca inmediatamente ✅, rate limit 429 tras 5-10 intentos según cliente ✅.

### Vulnerabilidades corregidas
- **Falta de revocación de JWT** (tokens robados eran válidos hasta expiración de 24-168h): ahora bump de `session_version` invalida atomicamente todos los tokens previos.
- **Deriva de permisos en sesiones activas**: al editar un rol custom, los users con ese rol reciben `session_version+1` → sus JWT quedan revocados hasta re-login.
- **Escalación de privilegios**: no se puede otorgar permisos que el actor no tiene, no se puede promover a superadmin salvo desde superadmin.
- **Dejar sistema sin superadmin activo**: bloqueado en degradación, suspensión y bloqueo del último superadmin activo.
- **JWT_SECRET débil o ausente en producción**: falla al arrancar (sin filtrar el valor).
- **CORS wildcard en producción**: rechazado al arrancar en `CULTORA_ENV=production|staging`.
- **Rate limiting ausente**: implementado en login, register, change-initial-password con retorno estructurado `HTTP 429` + header `Retry-After`.
- **Encabezados de seguridad ausentes**: middleware que setea `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, y CSP para respuestas HTML.
- **Auditoría con datos crudos**: IP anonimizada (último octeto → 0), UA truncado a 120 chars, filtro explícito de campos sensibles antes de persistir.
- **Permisos desconocidos aceptados silenciosamente**: ahora rechazan con error 400 y mensaje claro.

### Riesgos que siguen abiertos
- **Recuperación de contraseña por correo** (P0 según spec) — no implementada. Los usuarios que olviden su contraseña dependen de intervención admin.
- **Verificación de correo para cuentas nuevas** — no implementada.
- **2FA/TOTP para administradores** — no implementada.
- **JWT en `localStorage`** — sigue siendo vulnerable a XSS. La migración a cookies `HttpOnly` requiere refactor del frontend; queda documentada como Fase C.
- **Rate limiter en memoria** — no funciona en múltiples réplicas del backend. Migrar a Redis o Mongo con TTL cuando se escale.
- **Sin lockout progresivo** — el rate limit devuelve 429 pero no aplica retraso creciente. Suficiente para MVP pero no óptimo contra ataque distribuido.
- **CSP con `unsafe-inline`** — necesario para Tailwind runtime. Endurecer con hashes/nonces requiere build tooling adicional.
- **La cuenta `admin@cultora.net`** creada por el seed inseguro anterior sigue en BD; sus tokens previos fueron revocados por la migración de session_version, pero su contraseña original (comprometida) debe rotarse manualmente vía `/admin/perfil`.
- No hay **auditoría externa** de estos cambios.

### Instrucciones de despliegue
1. En el archivo de entorno de producción, configurar (sin defaults):
   ```
   CULTORA_ENV=production
   JWT_SECRET=<generar con `openssl rand -base64 48`>
   CORS_ORIGINS=https://app.tudominio.com,https://admin.tudominio.com
   ```
2. Verificar que **NO** existan en el entorno:
   - `CULTORA_BOOTSTRAP_ENABLED=true` (a menos que estés creando el primer superadmin)
   - `CORS_ORIGINS=*`
   - `JWT_SECRET=dev-secret` o similar
3. Reiniciar el backend. Debe fallar el arranque si:
   - JWT_SECRET falta o es débil
   - CORS_ORIGINS falta en production
4. Los usuarios activos serán deslogueados en el próximo request (JWT viejo sin `sv` = session_revoked). Comunicar antes de deployar.

### Verificaciones manuales que debe ejecutar el operador
1. Confirmar que `curl -X GET /api/auth/me` con un JWT viejo devuelve `session_revoked`.
2. Confirmar que iniciar sesión con la nueva versión da JWT con claim `sv`.
3. Confirmar que 15 intentos rápidos de login con contraseña incorrecta devuelven algún `HTTP 429`.
4. Confirmar que `POST /api/auth/logout-all` seguido de `GET /api/auth/me` responde `session_revoked`.
5. Confirmar que cambiar la contraseña rota el token: el viejo devuelve `session_revoked`, el nuevo funciona.
6. Confirmar que un admin común no puede promover a otro user a superadmin.
7. Confirmar que un admin común no puede crear un rol custom con permisos que él no posee.
8. Confirmar que `CORS_ORIGINS=*` en `CULTORA_ENV=production` impide el arranque del backend.
9. Confirmar que `JWT_SECRET` corto en `CULTORA_ENV=production` impide el arranque.
10. Revisar los headers HTTP de una respuesta cualquiera: debe traer `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`.

### Estado honesto
Esta fase cubre el núcleo de sesión, autorización y superadmin. **No es una auditoría de seguridad completa** ni afirma serlo. Recuperación de contraseña, verificación de correo y 2FA — items P0 según la spec original — quedan explícitamente para Fase B con scaffolding preparado. Antes de operar con datos sensibles reales se recomienda una auditoría externa.

