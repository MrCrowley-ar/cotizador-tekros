# Diagrama Entidad-Relación — Cotizador Tekros

## DER Completo (Mermaid)

```mermaid
erDiagram
    %% ─────────────── USUARIOS ───────────────
    usuarios {
        int id PK
        string nombre
        string email UK
        string password
        enum rol
        boolean activo
        timestamp fecha_creacion
    }

    %% ─────────────── CLIENTES ───────────────
    clientes {
        int id PK
        string nombre
        string cuit UK
        string direccion
        string telefono
        string email
        boolean activo
        timestamp fecha_creacion
    }

    %% ─────────────── PRODUCTOS ───────────────
    cultivos {
        int id PK
        string nombre
        boolean activo
    }

    hibridos {
        int id PK
        int cultivo_id FK
        string nombre
        boolean activo
    }

    bandas {
        int id PK
        int cultivo_id FK
        string nombre
        int orden
        boolean activo
    }

    %% ─────────────── PRECIOS (HISTORIAL) ───────────────
    precios {
        int id PK
        int hibrido_id FK
        int banda_id FK
        decimal precio
        date fecha
    }

    %% ─────────────── DESCUENTOS ───────────────
    descuentos {
        int id PK
        string nombre
        decimal valor_porcentaje
        date fecha
        boolean activo
    }

    descuentos_volumen {
        int id PK
        int cultivo_id FK
        decimal cantidad_min
        decimal cantidad_max
        decimal valor_porcentaje
        date fecha
    }

    %% ─────────────── COTIZACIONES ───────────────
    cotizaciones {
        int id PK
        string numero UK
        int cliente_id FK
        int usuario_id FK
        timestamp fecha_creacion
        enum estado
    }

    cotizacion_versiones {
        int id PK
        int cotizacion_id FK
        int version
        timestamp fecha
        int usuario_id FK
        decimal total
    }

    cotizacion_items {
        int id PK
        int version_id FK
        int cultivo_id FK
        int hibrido_id FK
        int banda_id FK
        decimal cantidad
        decimal precio_base
        decimal subtotal
    }

    cotizacion_item_descuentos {
        int id PK
        int cotizacion_item_id FK
        int descuento_id FK
        decimal valor_porcentaje
    }

    cotizacion_descuentos {
        int id PK
        int version_id FK
        int descuento_id FK
        decimal valor_porcentaje
    }

    %% ─────────────── MENSAJES / ANOTADOR ───────────────
    mensajes {
        int id PK
        int usuario_id FK
        text contenido
        timestamp fecha
        boolean fijado
    }

    mensaje_imagenes {
        int id PK
        int mensaje_id FK
        string url_imagen
    }

    %% ─────────────── RELACIONES ───────────────

    %% Productos
    cultivos ||--o{ hibridos : "tiene"
    cultivos ||--o{ bandas : "tiene"
    cultivos ||--o{ descuentos_volumen : "tiene"

    %% Precios
    hibridos ||--o{ precios : "tiene precio en"
    bandas ||--o{ precios : "aplica a"

    %% Cotizaciones
    clientes ||--o{ cotizaciones : "tiene"
    usuarios ||--o{ cotizaciones : "crea"
    cotizaciones ||--o{ cotizacion_versiones : "versiona"
    usuarios ||--o{ cotizacion_versiones : "registra"

    %% Items
    cotizacion_versiones ||--o{ cotizacion_items : "contiene"
    cultivos ||--o{ cotizacion_items : "referencia"
    hibridos ||--o{ cotizacion_items : "referencia"
    bandas ||--o{ cotizacion_items : "referencia"

    %% Descuentos por item
    cotizacion_items ||--o{ cotizacion_item_descuentos : "tiene"
    descuentos ||--o{ cotizacion_item_descuentos : "aplica como"

    %% Descuentos globales
    cotizacion_versiones ||--o{ cotizacion_descuentos : "tiene"
    descuentos ||--o{ cotizacion_descuentos : "aplica como"

    %% Mensajes
    usuarios ||--o{ mensajes : "escribe"
    mensajes ||--o{ mensaje_imagenes : "tiene"
```

---

## Convenciones de Diseño

| Patrón | Tablas afectadas | Motivo |
|--------|-----------------|--------|
| **Solo INSERT, nunca UPDATE** | `precios`, `descuentos`, `cotizacion_versiones` | Conserva historial completo |
| **Precio congelado** | `cotizacion_items.precio_base` | El precio no cambia aunque el catálogo se actualice |
| **Descuento congelado** | `cotizacion_item_descuentos.valor_porcentaje`, `cotizacion_descuentos.valor_porcentaje` | El descuento queda fijo al momento de cotizar |
| **Precio vigente** | `precios` | Usar `MAX(fecha)` agrupado por `(hibrido_id, banda_id)` |
| **Versión más reciente** | `cotizacion_versiones` | Usar `MAX(version)` agrupado por `cotizacion_id` |

---

## Índices Recomendados

| Tabla | Columnas indexadas | Tipo | Consulta que optimiza |
|-------|-------------------|------|-----------------------|
| `precios` | `(hibrido_id, banda_id, fecha DESC)` | BTREE | Precio vigente |
| `descuentos` | `(nombre, fecha DESC)` | BTREE | Historial de descuento |
| `descuentos_volumen` | `(cultivo_id, fecha DESC)` | BTREE | Descuentos vigentes por cultivo |
| `cotizaciones` | `(cliente_id)`, `(usuario_id)`, `(estado)` | BTREE | Filtros de listado |
| `cotizacion_versiones` | `(cotizacion_id, version DESC)` | BTREE | Versión más reciente |
| `cotizacion_items` | `(version_id)` | BTREE | Items de una versión |

---

## Estados de Cotización

```
borrador → enviada → aprobada → cerrada
                  ↘ rechazada
```

- **borrador**: en edición, permite crear nuevas versiones
- **enviada**: presentada al cliente, en espera de respuesta
- **aprobada**: aceptada por el cliente
- **rechazada**: declinada por el cliente
- **cerrada**: proceso completado

---

## Tablas: 15 en total

| Módulo | Tablas |
|--------|--------|
| Autenticación | `usuarios` |
| Clientes | `clientes` |
| Catálogo | `cultivos`, `hibridos`, `bandas` |
| Precios | `precios` |
| Descuentos | `descuentos`, `descuentos_volumen` |
| Cotizaciones | `cotizaciones`, `cotizacion_versiones`, `cotizacion_items`, `cotizacion_item_descuentos`, `cotizacion_descuentos` |
| Mensajes | `mensajes`, `mensaje_imagenes` |
