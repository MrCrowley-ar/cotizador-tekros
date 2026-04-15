# Guía de Deployment — Cotizador Tekros

## Primera vez (servidor nuevo o entorno limpio)

### 1. Clonar el repositorio
```bash
git clone <url-del-repo>
cd cotizador-tekros
```

### 2. Configurar el archivo `.env`
```bash
cp .env.example .env
```

Editar `.env` con los valores reales:

```
DB_PASSWORD=<contraseña segura para la base de datos>
JWT_SECRET=<string aleatorio largo — generá uno con: openssl rand -hex 64>

INITIAL_ADMIN_NOMBRE=NicoB
INITIAL_ADMIN_EMAIL=nicolas.bergmann@tekros.org
INITIAL_ADMIN_PASSWORD=<contraseña del usuario admin>
```

> **Importante:** `INITIAL_ADMIN_*` solo se usa la primera vez que se levanta la base de datos.
> Después de esa primera vez, cambiar estos valores no tiene efecto.

### 3. Levantar los contenedores
```bash
docker compose up -d --build
```

Las migraciones corren automáticamente al iniciar el backend.
El usuario admin se crea desde las variables `INITIAL_ADMIN_*` del `.env`.

### 4. Verificar que todo funciona
```bash
docker compose ps          # todos en estado "Up"
docker compose logs -f backend  # ver logs del backend
```

Probar login en: `http://localhost:3001/auth/login` con el email y password del `.env`.

---

## Operaciones del día a día

### Hacer cambios de código y aplicarlos
```bash
docker compose up -d --build
```
Los datos de la base de datos **NO se pierden** — solo se reconstruye la imagen.

### Reiniciar servicios sin rebuild
```bash
docker compose restart
```

### Ver logs
```bash
docker compose logs -f          # todos los servicios
docker compose logs -f backend  # solo backend
docker compose logs -f postgres # solo base de datos
```

### Detener sin perder datos
```bash
docker compose down    # para los contenedores, el volumen queda intacto
```

---

## Backup de la base de datos

Correr antes de cualquier operación riesgosa o periódicamente:

```bash
./backup.sh
```

Genera un archivo `.sql` en `./backups/` con el timestamp actual.
Ejemplo: `backups/backup_20260320_143000.sql`

> Los archivos `.sql` están en `.gitignore` — **nunca se suben al repositorio**.
> Guardalos en un lugar seguro (drive, NAS, etc.).

---

## Restaurar la base de datos en otro servidor

### 1. Copiar el backup al directorio de restore
```bash
cp backups/backup_20260320_143000.sql backups/restore/init.sql
```

Solo puede haber **un archivo** en `backups/restore/` a la vez.

### 2. Bajar los contenedores y borrar el volumen
```bash
docker compose down -v
```

> ⚠️ Esto borra todos los datos actuales. Asegurate de tener el backup antes.

### 3. Levantar — el backup se importa automáticamente
```bash
docker compose up -d --build
```

PostgreSQL detecta el volumen vacío e importa `init.sql` antes de que arranque el backend.

### 4. Limpiar el archivo de restore
```bash
rm backups/restore/init.sql
```

Una vez restaurado, borrar el archivo para evitar que se intente importar en el próximo reinicio.

---

## Cuándo se pierden / NO se pierden los datos

| Comando | ¿Se pierden datos? |
|---|---|
| `docker compose up --build` | **NO** — solo rebuilda el código |
| `docker compose down` | **NO** — el volumen de postgres queda |
| `docker compose restart` | **NO** |
| `docker compose down -v` | **SÍ** — borra los volúmenes |

**Regla:** nunca usar `-v` sin hacer backup primero.

---

## Deploy en Google Cloud Run

Esta sección cubre el deploy alternativo en **Google Cloud Run** (frontend y backend como dos
servicios separados). No reemplaza al flujo de docker-compose de arriba — ese sigue siendo el
camino recomendado para on-prem.

### Arquitectura

- **backend** (`backend/Dockerfile`): NestJS corriendo con `node dist/main`. Lee `PORT` del
  entorno (`backend/src/main.ts:37`) y bindea `0.0.0.0`, así que Cloud Run puede inyectar su
  `PORT=8080`.
- **frontend** (`frontend/Dockerfile`): nginx sirviendo el bundle estático de Vite. Usa el
  entrypoint oficial de nginx con `NGINX_ENVSUBST_FILTER=^(PORT|BACKEND_URL)$` para que el
  template `nginx.conf.template` se renderice al arrancar, inyectando el `PORT` y apuntando
  el `proxy_pass /api` al backend. Ver `frontend/Dockerfile:44-46` y
  `frontend/nginx.conf.template:20`.
- **postgres**: **no** se despliega en Cloud Run. Usar Cloud SQL (PostgreSQL) o una base
  manejada equivalente. El backend **no** lee `DATABASE_URL`: lee 5 variables separadas
  (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`), ver
  `backend/src/database/database.module.ts:13-17`. Hay que pasárselas como env vars o como
  secretos de Secret Manager.

### Provisionar la base de datos (Cloud SQL)

Antes del deploy del backend hay que tener una Postgres accesible. La opción estándar es
**Cloud SQL** conectada por el **Cloud SQL Auth Proxy** que Cloud Run expone como Unix
socket:

```bash
gcloud sql instances create cotizador-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=<REGION> --project=<PROJECT>

gcloud sql databases create cotizador_db \
  --instance=cotizador-db --project=<PROJECT>

gcloud sql users create tekros_user \
  --instance=cotizador-db \
  --password='<password-fuerte>' --project=<PROJECT>

# Tomá nota del connection name (formato PROJECT:REGION:INSTANCE)
gcloud sql instances describe cotizador-db --project=<PROJECT> \
  --format='value(connectionName)'
```

Si tu Postgres ya está en otro lado (otro cloud, on-prem, Supabase, Neon, etc.), saltá esta
sección y en el deploy pasá `DB_HOST` directamente al hostname/IP accesible. Si es una IP
privada dentro de tu VPC, además vas a necesitar un **Serverless VPC Access Connector** y el
flag `--vpc-connector=<connector-name>` en el deploy.

### Build + deploy

El camino más robusto es **Cloud Build** (construye en servidores de Google, siempre
`linux/amd64`, evita sorpresas si estás buildeando desde una Mac con Apple Silicon).

```bash
# Backend
gcloud builds submit ./backend \
  --tag gcr.io/<PROJECT>/cotizador-backend:latest

gcloud run deploy cotizador-backend \
  --image gcr.io/<PROJECT>/cotizador-backend:latest \
  --region <REGION> \
  --project <PROJECT> \
  --allow-unauthenticated \
  --add-cloudsql-instances=<PROJECT>:<REGION>:cotizador-db \
  --set-env-vars "DB_HOST=/cloudsql/<PROJECT>:<REGION>:cotizador-db" \
  --set-env-vars "DB_PORT=5432" \
  --set-env-vars "DB_USERNAME=tekros_user" \
  --set-env-vars "DB_PASSWORD=<password>" \
  --set-env-vars "DB_DATABASE=cotizador_db" \
  --set-env-vars "JWT_SECRET=<secret>" \
  --set-env-vars "FRONTEND_URL=https://<frontend>.run.app" \
  --set-env-vars "INITIAL_ADMIN_NOMBRE=NicoB" \
  --set-env-vars "INITIAL_ADMIN_EMAIL=nicolas.bergmann@tekros.org" \
  --set-env-vars "INITIAL_ADMIN_PASSWORD=<password-admin>"

# Frontend — BACKEND_URL tiene que apuntar al servicio de backend recién deployado
gcloud builds submit ./frontend \
  --tag gcr.io/<PROJECT>/cotizador-frontend:latest

gcloud run deploy cotizador-frontend \
  --image gcr.io/<PROJECT>/cotizador-frontend:latest \
  --region <REGION> \
  --project <PROJECT> \
  --allow-unauthenticated \
  --set-env-vars "BACKEND_URL=https://<backend>.run.app"
```

Variables importantes:

| Variable | Servicio | Por qué |
|---|---|---|
| `DB_HOST` | backend | Con Cloud SQL, la ruta del Unix socket `/cloudsql/<connection-name>`; el driver `pg` detecta el prefijo `/` y usa socket en vez de TCP. Con DB externa, hostname o IP. Default del código: `localhost` (inservible en Cloud Run). Ver `backend/src/database/database.module.ts:13`. |
| `DB_PORT` | backend | `5432`. Se ignora cuando `DB_HOST` es un Unix socket, pero no molesta. |
| `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | backend | Credenciales y nombre de base. **No hay default** para username/password: si faltan, TypeORM cuelga intentando conectar. |
| `JWT_SECRET` | backend | Mismo valor que en el `.env` de docker-compose. |
| `FRONTEND_URL` | backend | Se usa en `app.enableCors()` (`backend/src/main.ts:32`). |
| `INITIAL_ADMIN_*` | backend | Crea el admin en la primera migración (solo 1ª vez). |
| `BACKEND_URL` | frontend | URL completa `https://...run.app` del servicio de backend; reemplaza el default `http://localhost:3001` del Dockerfile. |

> **`--add-cloudsql-instances` es obligatorio** cuando usás Cloud SQL vía socket. Sin ese flag
> el socket `/cloudsql/<connection-name>` **no existe** dentro del container, TypeORM queda
> colgado tratando de conectar, `app.listen()` nunca se ejecuta, y Cloud Run aborta la
> revisión con el error *"container failed to start and listen on the port defined by the
> PORT=8080 environment variable"*. Ver la sección de troubleshooting más abajo.

> **Secrets, no env vars:** `DB_PASSWORD`, `JWT_SECRET` e `INITIAL_ADMIN_PASSWORD` deberían
> vivir en Secret Manager y pasarse con `--set-secrets` en lugar de `--set-env-vars`. Para un
> primer deploy está bien así, pero migrarlos queda pendiente como higiene.

> **`--allow-unauthenticated` es obligatorio en ambos servicios.** El frontend hace
> `proxy_pass` al `.run.app` del backend desde el container nginx, y Cloud Run/GFE bloquea
> esas requests si el backend no permite invocación anónima (igual que las del browser al
> frontend).

Si ya hay un Cloud Build trigger conectado a GitHub, basta con pushear a la branch configurada
y el trigger se encarga del build + deploy. Revisá `gcloud builds list` para confirmar que
quedó en `SUCCESS`.

### Troubleshooting

#### "Error: Forbidden — Your client does not have permission to get URL / from this server."

Ese HTML **no** lo emite nginx ni NestJS. Es la página de error de **Google Frontend (GFE)**,
que corre por delante de Cloud Run. Aparece cuando el servicio no tiene concedido
`roles/run.invoker` a `allUsers` — la request nunca llega al container.

Fix:

```bash
gcloud run services add-iam-policy-binding <SERVICE> \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --region=<REGION> --project=<PROJECT>

# Verificar
gcloud run services get-iam-policy <SERVICE> \
  --region=<REGION> --project=<PROJECT>
```

Hay que correrlo **en los dos servicios** (frontend y backend). Si ves el Forbidden al cargar
la URL del frontend, falta en el frontend. Si el SPA carga pero las llamadas a `/api/...`
devuelven 502 / 403, falta en el backend.

Si el comando falla con `One or more users named in the policy do not belong to a permitted
customer`, tu organización tiene una *Domain Restricted Sharing* policy y no se puede otorgar
acceso a `allUsers`. Opciones: pedir al admin de GCP una excepción, poner el servicio detrás
de IAP, o autenticar service-to-service con `Authorization: Bearer $(gcloud auth
print-identity-token)`.

#### "El backend no inicia / no hay logs"

Este síntoma tiene varias causas posibles que se ven iguales desde afuera. Correr los tres
comandos en orden y mirar cuál falla:

```bash
# (a) ¿La última build del trigger quedó verde? Si está en FAILURE, la nueva imagen nunca
#     se publicó y Cloud Run sigue corriendo la revisión anterior.
gcloud builds list --project=<PROJECT> --limit=5 \
  --format='table(id,status,createTime,source.repoSource.branchName)'

# (b) ¿Cuál es la revisión activa y en qué estado está? Si latestCreatedRevisionName !=
#     latestReadyRevisionName, la nueva revisión no llegó a Ready. El motivo sale en
#     status.conditions (ej: "Container failed to start. Failed to start and then listen on
#     the port defined by the PORT environment variable.").
gcloud run services describe cotizador-backend \
  --region=<REGION> --project=<PROJECT> \
  --format='value(status.latestReadyRevisionName,status.latestCreatedRevisionName,status.conditions)'

# (c) Logs crudos del servicio, sin los filtros del UI de Cloud Logging.
gcloud run services logs read cotizador-backend \
  --region=<REGION> --project=<PROJECT> --limit=200

# (c-bis) Fallback si (c) sale vacío pero (b) dice Ready=True: traer los logs por el API de
#         logging directamente.
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="cotizador-backend"' \
  --project=<PROJECT> --limit=200 \
  --format='value(timestamp,severity,textPayload)'
```

Lecturas típicas:

- **(a) FAILURE** → abrir el link de la build en la consola y leer el error de `npm run
  build` / `npm ci`.
- **(b) "Container failed to start and listen on the port defined by PORT=8080"** → ver la
  subsección dedicada más abajo; en este repo la causa casi siempre es que `TypeOrmModule`
  cuelga conectando a la DB antes de que `bootstrap()` llegue a `app.listen()`, no un
  problema de `process.env.PORT`.
- **(c) con un stack trace de NestJS** → el container sí arranca pero crashea: leer el
  mensaje (típicamente falta alguna de `DB_HOST`/`DB_USERNAME`/`DB_PASSWORD`/`DB_DATABASE` o
  `JWT_SECRET`).
- **(c) con `Nest application successfully started` + `Backend running on port 8080`** → el
  backend arranca perfecto; el síntoma "no inicia" en realidad es el Forbidden de GFE (volver
  al fix de `allUsers` de arriba, aplicado al backend).
- **(c) completamente vacío y (b) Ready=True** → los logs existen, el UI te está filtrando;
  usar `(c-bis)`.

#### "Container failed to start and listen on the port defined by PORT=8080"

Este error es engañoso: suena a "tu app no respeta `PORT`", pero en este repo el código está
correcto (`backend/src/main.ts:37` lee `process.env.PORT ?? '3001'` y bindea `0.0.0.0`). La
causa real es casi siempre que **`NestFactory.create(AppModule)` se queda colgado antes de
llegar a `app.listen()`**, y el proceso del container nunca se llega a bindear al puerto.

El culpable habitual es `DatabaseModule`: `TypeOrmModule.forRootAsync` con `migrationsRun: true`
(`backend/src/database/database.module.ts:8-23`) no resuelve hasta que logra conectarse y correr
las migraciones pendientes. Si las env vars de la DB apuntan a ningún lado, la conexión queda
reintentando en silencio hasta que Cloud Run mata la revisión por timeout.

Checklist para destrabarlo:

1. **¿Están todas las env vars de la DB seteadas en la revisión?** Revisá el YAML del servicio:
   ```bash
   gcloud run services describe cotizador-backend \
     --region=<REGION> --project=<PROJECT> \
     --format='value(spec.template.spec.containers[0].env)'
   ```
   Tienen que aparecer `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`,
   `JWT_SECRET`. Si falta alguna, la conexión a la DB no va a funcionar y vas a caer acá.
2. **Si usás Cloud SQL, ¿está el flag `--add-cloudsql-instances` en el deploy?** Sin ese flag,
   la ruta `/cloudsql/<connection-name>` no existe dentro del container y el socket nunca se
   abre. Confirmalo con:
   ```bash
   gcloud run services describe cotizador-backend \
     --region=<REGION> --project=<PROJECT> \
     --format='value(spec.template.metadata.annotations."run.googleapis.com/cloudsql-instances")'
   ```
   Debería devolver el connection name completo.
3. **¿`DB_HOST` está bien formado?** Con Cloud SQL socket tiene que ser exactamente
   `/cloudsql/PROJECT:REGION:INSTANCE` (empieza con `/`, no con `https://` ni con IP). Con DB
   externa pública, tiene que ser un hostname resoluble desde internet.
4. **¿La service account del backend tiene `roles/cloudsql.client`?** Sin ese rol, el proxy
   de Cloud SQL rechaza la conexión:
   ```bash
   gcloud projects add-iam-policy-binding <PROJECT> \
     --member="serviceAccount:<PROJECT-NUMBER>-compute@developer.gserviceaccount.com" \
     --role="roles/cloudsql.client"
   ```
5. **¿La DB es alcanzable desde donde estás?** Probá con `psql` o el Cloud SQL Studio en la
   consola con las mismas credenciales. Si falla por `psql`, va a fallar igual desde Cloud Run.

Una vez corregido lo que corresponda, redeployá. Si el problema era env vars o el flag de
Cloud SQL, no hace falta rebuildear la imagen — basta con `gcloud run services update` con
las flags nuevas, o directamente re-run del Cloud Build trigger si está configurado con el
deploy en el mismo `cloudbuild.yaml`.

> **Importante sobre "no hay logs porque no inicia":** si Cloud Run **sí** arrancó una revisión
> del container, aunque sea por 2 segundos, siempre hay algo en Cloud Logging. "Vacío total"
> en la consola **no** significa que la app no arrancó — significa casi siempre o (1) filtro
> mal puesto en el UI, o (2) las requests están siendo bloqueadas por GFE antes de llegar al
> container, entonces la app no loguea nada porque no está recibiendo tráfico.
