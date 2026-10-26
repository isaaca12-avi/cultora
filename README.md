# Cultora

Copiloto estratégico para proyectos culturales: diagnóstico guiado, planes de acción, convocatorias, biblioteca de conocimiento, foro, agentes y panel de administración.

**Stack**

- **Frontend:** React 19, CRACO, Tailwind CSS, React Router, Axios.
- **Backend:** FastAPI, Motor, MongoDB, JWT y bcrypt.
- **IA:** Emergent LLM (opcional). Sin clave de IA, la generación de planes usa un motor determinista de respaldo.

## Estructura

```
.
├── backend/            API FastAPI, semillas y tests
│   ├── server.py       Punto de entrada de la API
│   ├── .env.example    Variables de entorno del backend
│   └── requirements.txt
├── frontend/           SPA React (Create React App + CRACO)
│   ├── src/
│   ├── public/
│   └── .env.example    URL del backend para el frontend
├── ABRIR-CULTORA.cmd   Atajo local para Windows (entorno ya preparado)
└── README.md
```

---

## Correr en local

### Clonar el repositorio

```bash
git clone https://github.com/isaaca12-avi/cultora.git
cd cultora
```

### Requisitos

- **Python 3.12**
- **Node.js 20 LTS o superior** y **Yarn 1.22**
- **MongoDB 7** local o un clúster de **MongoDB Atlas**
- Opcional: clave `EMERGENT_LLM_KEY` para narrativas generadas por IA.
- Opcional: credenciales SMTP para correos de recuperación y verificación.

### 1. MongoDB

Con MongoDB instalado localmente:

```bash
mongod --dbpath ./mongodb-data --port 27017 --bind_ip 127.0.0.1
```

También puedes usar MongoDB Atlas. En ese caso, usa la cadena de conexión `mongodb+srv://...` como `MONGO_URL`.

### 2. Backend

```bash
cd backend

# Crear y activar el entorno virtual
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
# Windows (CMD)
.venv\Scripts\activate.bat
# macOS / Linux
source .venv/bin/activate

python -m pip install --upgrade pip
```

Instala las dependencias. `emergentintegrations` **no está en PyPI**, así que hay que indicar el índice de Emergent:

```bash
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

> Ese paquete descarga `litellm` desde un wheel alojado en `customer-assets.emergentagent.com`. Si tu red bloquea dominios externos, la instalación fallará; permite ambos dominios o instala desde una red sin restricciones.

Copia el archivo de variables y edítalo:

```bash
# Windows
Copy-Item .env.example .env
# macOS / Linux
cp .env.example .env
```

Configuración mínima para desarrollo:

```env
MONGO_URL=mongodb://127.0.0.1:27017
DB_NAME=cultora
JWT_SECRET=<secreto-de-32-o-mas-caracteres>
CULTORA_ENV=development
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000
```

Genera un `JWT_SECRET` robusto:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Arranca la API:

```bash
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8001
```

Comprueba:

- API: <http://localhost:8001/api/health>
- Documentación interactiva: <http://localhost:8001/docs>

> El arranque puede tardar unos 40 segundos por la carga de `litellm`. Espera antes de asumir que falló.

En el primer arranque se crean índices, roles y contenido de ejemplo (foro, convocatorias, biblioteca). **No se crea ningún administrador por defecto**; usa el bootstrap de la sección siguiente.

### 3. Frontend

En otra terminal:

```bash
cd frontend

# Windows
Copy-Item .env.example .env
# macOS / Linux
cp .env.example .env

yarn install
yarn start
```

Abre <http://localhost:3000>. El archivo `frontend/.env` debe apuntar al backend:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Si el backend corre en otro host o puerto, actualiza esa variable y los `CORS_ORIGINS` del backend.

### 4. Crear el primer superadministrador

En `backend/.env` (o en las variables de entorno del hosting):

```env
CULTORA_BOOTSTRAP_ENABLED=true
CULTORA_BOOTSTRAP_ADMIN_EMAIL=tu@email.com
CULTORA_BOOTSTRAP_ADMIN_PASSWORD=UnaClaveSegura#2026
```

Requisitos de la contraseña: **12+ caracteres, mayúscula, minúscula, dígito y símbolo**. Reinicia la API, entra en `/login` con esa cuenta y cambia la contraseña cuando se te solicite. Después **desactiva el bootstrap** y elimina la contraseña del entorno:

```env
CULTORA_BOOTSTRAP_ENABLED=false
CULTORA_BOOTSTRAP_ADMIN_PASSWORD=
```

El panel de administración está en `/admin`.

### 5. Registro de usuarios

Los usuarios normales pueden registrarse en `/registro`. La contraseña debe tener **10+ caracteres, mayúscula, minúscula y dígito**.

### Atajo en Windows

Si esta máquina ya tiene el runtime local en `%LOCALAPPDATA%\CultoraDev` y el entorno virtual en `backend\.venv`, puedes ejecutar `ABRIR-CULTORA.cmd`: levanta MongoDB, la API y una vista previa con proxy en <http://127.0.0.1:4318>. No es un flujo portable; en un clon nuevo sigue los pasos manuales.

---

## Desplegar en un hosting

Arquitectura recomendada:

```
Navegador → Frontend estático (Netlify/Vercel)
          → API FastAPI (Render/Railway)
          → MongoDB Atlas
```

### 1. MongoDB Atlas

1. Crea un clúster (M0 sirve para empezar).
2. Crea un usuario de base de datos con contraseña fuerte.
3. En **Network Access**, permite la IP de salida del hosting. Si el proveedor no ofrece IP fija, usa `0.0.0.0/0` y protege la base con credenciales fuertes.
4. Copia la cadena de conexión:

```text
mongodb+srv://USUARIO:CONTRASEÑA@cluster.mongodb.net/cultora?retryWrites=true&w=majority
```

Si la contraseña contiene caracteres especiales (`@`, `#`, `:`...), codifícalos en URL.

### 2. API en Render (o Railway)

Crea un **Web Service** conectado a este repositorio:

| Ajuste | Valor |
| --- | --- |
| Root Directory | `backend` |
| Runtime | Python 3.12 |
| Build Command | `python -m pip install --upgrade pip && pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` |
| Start Command | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/health` |
| Python version | `PYTHON_VERSION=3.12.10` (variable de entorno) |

Variables de entorno mínimas:

| Variable | Valor |
| --- | --- |
| `MONGO_URL` | Cadena de MongoDB Atlas |
| `DB_NAME` | `cultora` |
| `JWT_SECRET` | Secreto aleatorio de 32+ caracteres |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRE_HOURS` | `24` |
| `CULTORA_ENV` | `production` |
| `CORS_ORIGINS` | URL del frontend, p. ej. `https://cultora.netlify.app` |
| `FRONTEND_URL` | La misma URL del frontend |
| `CULTORA_EXPOSE_AUTH_LINKS` | `false` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Solo si vas a enviar correos reales |
| `EMERGENT_LLM_KEY` | Opcional; sin ella se usa el generador de respaldo |

Notas:

- En `production` el backend exige `JWT_SECRET` de 32+ caracteres y `CORS_ORIGINS` explícito (no admite `*`).
- Si todavía no tienes la URL del frontend, usa una provisional (por ejemplo `https://cultora.netlify.app`) o crea primero el sitio en Netlify para reservar el nombre. Actualízala al terminar el despliegue.
- Usa **un solo worker**. El limitador de intentos vive en memoria; con varios workers cada proceso tendría su propio contador.
- En planes gratuitos el servicio se suspende por inactividad; la primera petición puede tardar 30-60 segundos.
- El bootstrap del primer superadmin se configura aquí igual que en local (sección anterior), y se desactiva después del primer acceso.

### 3. Frontend en Netlify

1. Crea un sitio desde el repositorio.
2. Configura:

| Ajuste | Valor |
| --- | --- |
| Base directory | `frontend` |
| Build command | `yarn build` |
| Publish directory | `build` |
| `REACT_APP_BACKEND_URL` | `https://TU-API.onrender.com` (sin barra final) |
| `NODE_VERSION` | `20` |
| `YARN_VERSION` | `1.22.22` |

3. El repositorio ya incluye `frontend/public/_redirects` para que las rutas de React Router funcionen al recargar. Si falta, créalo con:

```text
/*    /index.html   200
```

4. Despliega. La URL del sitio será algo como `https://cultora.netlify.app`.
5. Vuelve a Render y actualiza `CORS_ORIGINS` y `FRONTEND_URL` con esa URL. Redespliega la API.

> `REACT_APP_BACKEND_URL` se incrusta en el build. Si cambias la URL de la API, vuelve a desplegar el frontend.

### 4. Orden recomendado

1. Crear MongoDB Atlas.
2. Desplegar la API en Render y verificar `/api/health`.
3. Desplegar el frontend en Netlify.
4. Actualizar `CORS_ORIGINS` y `FRONTEND_URL` en Render con la URL final del frontend.
5. Crear el superadmin con el bootstrap y desactivarlo.
6. Probar registro, login, recuperación de contraseña y generación de un plan.

### Alternativa: Vercel para el frontend

Mismos valores que Netlify: directorio raíz `frontend`, build `yarn build`, salida `build` y `REACT_APP_BACKEND_URL` como variable de entorno. Añade un `vercel.json` en `frontend/` para el enrutado del lado del cliente:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Migrar datos locales a Atlas (opcional)

Con MongoDB Database Tools instalado:

```bash
mongodump --uri="mongodb://127.0.0.1:27017/cultora" --out=./cultora-backup
mongorestore --uri="mongodb+srv://USUARIO:CONTRASEÑA@cluster.mongodb.net/cultora" ./cultora-backup/cultora
```

No migres usuarios de prueba ni secretos a producción sin revisarlos antes.

---

## Variables de entorno del backend

Referencia completa en [`backend/.env.example`](backend/.env.example).

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `MONGO_URL` | Sí | Cadena de conexión de MongoDB |
| `DB_NAME` | Sí | Nombre de la base de datos |
| `JWT_SECRET` | Sí | Firma de tokens; 32+ caracteres en producción |
| `JWT_ALGORITHM` | No | Por defecto `HS256` |
| `JWT_EXPIRE_HOURS` | No | Duración del token; por defecto `24` |
| `CULTORA_ENV` | No | `development`, `staging` o `production` |
| `CORS_ORIGINS` | Sí en producción | Orígenes permitidos, separados por comas |
| `FRONTEND_URL` | Sí | URL usada en enlaces de correo |
| `AUTH_TOKEN_TTL_MINUTES` | No | Vigencia de enlaces de recuperación |
| `EMAIL_VERIFICATION_TTL_HOURS` | No | Vigencia de verificación de email |
| `CULTORA_EXPOSE_AUTH_LINKS` | No | Solo desarrollo; nunca activar en producción |
| `SMTP_*` | No | Correo transaccional; sin SMTP los enlaces se escriben en el log |
| `EMERGENT_LLM_KEY` | No | Narrativas con IA; sin clave se usa el respaldo |
| `CULTORA_BOOTSTRAP_*` | No | Creación inicial del superadmin |

---

## Problemas frecuentes

**“No pudimos conectar con el servidor”.**
La API no está corriendo o el frontend apunta a una URL incorrecta. Verifica `/api/health` y `REACT_APP_BACKEND_URL`.

**Error de CORS en el navegador.**
`CORS_ORIGINS` debe incluir el origen exacto del frontend, con esquema y sin barra final. Reinicia o redespliega la API después de cambiarlo.

**La API no arranca por `JWT_SECRET` débil.**
En `production`/`staging` el secreto debe tener 32+ caracteres y no ser un valor de ejemplo.

**Falla la instalación de `emergentintegrations`.**
Falta el índice extra o el acceso a `customer-assets.emergentagent.com`. Usa el comando de instalación de este README y revisa la red del hosting.

**Los planes salen con textos genéricos.**
No hay `EMERGENT_LLM_KEY` configurada o la clave no es válida. El plan se genera igual con el motor de respaldo.

**Las rutas internas dan 404 al recargar en Netlify/Vercel.**
Falta el rewrite de SPA a `/index.html`.

---

## Seguridad

- No subas `backend/.env` ni `frontend/.env` al repositorio.
- Usa un `JWT_SECRET` distinto por entorno.
- Mantén `CORS_ORIGINS` limitado a tus dominios.
- Desactiva el bootstrap después de crear el primer superadmin.
- Configura SMTP en producción para que la recuperación de contraseña sea funcional.
- Sirve siempre el frontend y la API por HTTPS.
