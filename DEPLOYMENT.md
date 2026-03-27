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
