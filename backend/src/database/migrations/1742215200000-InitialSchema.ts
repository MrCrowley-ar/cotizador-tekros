import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1742215200000 implements MigrationInterface {
  name = 'InitialSchema1742215200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── ENUM: rol_usuario ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."usuarios_rol_enum" AS ENUM('admin', 'vendedor')
    `);

    // ─── ENUM: estado_cotizacion ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."cotizaciones_estado_enum" AS ENUM(
        'borrador', 'enviada', 'aprobada', 'rechazada', 'cerrada'
      )
    `);

    // ─── USUARIOS ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id"             SERIAL NOT NULL,
        "nombre"         CHARACTER VARYING(200) NOT NULL,
        "email"          CHARACTER VARYING(200) NOT NULL,
        "password"       CHARACTER VARYING(255) NOT NULL,
        "rol"            "public"."usuarios_rol_enum" NOT NULL DEFAULT 'vendedor',
        "activo"         BOOLEAN NOT NULL DEFAULT true,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_usuarios_email" UNIQUE ("email"),
        CONSTRAINT "PK_usuarios" PRIMARY KEY ("id")
      )
    `);

    // ─── CLIENTES ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "clientes" (
        "id"             SERIAL NOT NULL,
        "nombre"         CHARACTER VARYING(200) NOT NULL,
        "cuit"           CHARACTER VARYING(20)  NOT NULL,
        "direccion"      CHARACTER VARYING(300),
        "telefono"       CHARACTER VARYING(50),
        "email"          CHARACTER VARYING(200),
        "activo"         BOOLEAN NOT NULL DEFAULT true,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_clientes_cuit" UNIQUE ("cuit"),
        CONSTRAINT "PK_clientes" PRIMARY KEY ("id")
      )
    `);

    // ─── CULTIVOS ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "cultivos" (
        "id"     SERIAL NOT NULL,
        "nombre" CHARACTER VARYING(100) NOT NULL,
        "activo" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_cultivos" PRIMARY KEY ("id")
      )
    `);

    // ─── HIBRIDOS ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "hibridos" (
        "id"         SERIAL NOT NULL,
        "cultivo_id" INTEGER NOT NULL,
        "nombre"     CHARACTER VARYING(200) NOT NULL,
        "activo"     BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_hibridos" PRIMARY KEY ("id")
      )
    `);

    // ─── BANDAS ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "bandas" (
        "id"         SERIAL NOT NULL,
        "cultivo_id" INTEGER NOT NULL,
        "nombre"     CHARACTER VARYING(100) NOT NULL,
        "orden"      INTEGER NOT NULL DEFAULT 0,
        "activo"     BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_bandas" PRIMARY KEY ("id")
      )
    `);

    // ─── PRECIOS (historial inmutable) ────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "precios" (
        "id"         SERIAL NOT NULL,
        "hibrido_id" INTEGER NOT NULL,
        "banda_id"   INTEGER NOT NULL,
        "precio"     NUMERIC(10,2) NOT NULL,
        "fecha"      DATE NOT NULL,
        CONSTRAINT "PK_precios" PRIMARY KEY ("id")
      )
    `);

    // ─── DESCUENTOS (historial por nombre) ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "descuentos" (
        "id"               SERIAL NOT NULL,
        "nombre"           CHARACTER VARYING(200) NOT NULL,
        "valor_porcentaje" NUMERIC(5,2) NOT NULL,
        "fecha"            DATE NOT NULL,
        "activo"           BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_descuentos" PRIMARY KEY ("id")
      )
    `);

    // ─── DESCUENTOS POR VOLUMEN ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "descuentos_volumen" (
        "id"               SERIAL NOT NULL,
        "cultivo_id"       INTEGER NOT NULL,
        "cantidad_min"     NUMERIC(10,2) NOT NULL,
        "cantidad_max"     NUMERIC(10,2),
        "valor_porcentaje" NUMERIC(5,2) NOT NULL,
        "fecha"            DATE NOT NULL,
        CONSTRAINT "PK_descuentos_volumen" PRIMARY KEY ("id")
      )
    `);

    // ─── COTIZACIONES ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "cotizaciones" (
        "id"             SERIAL NOT NULL,
        "numero"         CHARACTER VARYING(50) NOT NULL,
        "cliente_id"     INTEGER NOT NULL,
        "usuario_id"     INTEGER NOT NULL,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        "estado"         "public"."cotizaciones_estado_enum" NOT NULL DEFAULT 'borrador',
        CONSTRAINT "UQ_cotizaciones_numero" UNIQUE ("numero"),
        CONSTRAINT "PK_cotizaciones" PRIMARY KEY ("id")
      )
    `);

    // ─── COTIZACION VERSIONES ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "cotizacion_versiones" (
        "id"             SERIAL NOT NULL,
        "cotizacion_id"  INTEGER NOT NULL,
        "version"        INTEGER NOT NULL,
        "fecha"          TIMESTAMP NOT NULL DEFAULT now(),
        "usuario_id"     INTEGER NOT NULL,
        "total"          NUMERIC(12,2) NOT NULL,
        CONSTRAINT "UQ_cotizacion_versiones_cotizacion_version" UNIQUE ("cotizacion_id", "version"),
        CONSTRAINT "PK_cotizacion_versiones" PRIMARY KEY ("id")
      )
    `);

    // ─── COTIZACION ITEMS ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "cotizacion_items" (
        "id"          SERIAL NOT NULL,
        "version_id"  INTEGER NOT NULL,
        "cultivo_id"  INTEGER NOT NULL,
        "hibrido_id"  INTEGER NOT NULL,
        "banda_id"    INTEGER NOT NULL,
        "cantidad"    NUMERIC(10,2) NOT NULL,
        "precio_base" NUMERIC(10,2) NOT NULL,
        "subtotal"    NUMERIC(12,2) NOT NULL,
        CONSTRAINT "PK_cotizacion_items" PRIMARY KEY ("id")
      )
    `);

    // ─── COTIZACION ITEM DESCUENTOS ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "cotizacion_item_descuentos" (
        "id"                  SERIAL NOT NULL,
        "cotizacion_item_id"  INTEGER NOT NULL,
        "descuento_id"        INTEGER NOT NULL,
        "valor_porcentaje"    NUMERIC(5,2) NOT NULL,
        CONSTRAINT "PK_cotizacion_item_descuentos" PRIMARY KEY ("id")
      )
    `);

    // ─── COTIZACION DESCUENTOS (globales por versión) ─────────────────────
    await queryRunner.query(`
      CREATE TABLE "cotizacion_descuentos" (
        "id"               SERIAL NOT NULL,
        "version_id"       INTEGER NOT NULL,
        "descuento_id"     INTEGER NOT NULL,
        "valor_porcentaje" NUMERIC(5,2) NOT NULL,
        CONSTRAINT "PK_cotizacion_descuentos" PRIMARY KEY ("id")
      )
    `);

    // ─── MENSAJES ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "mensajes" (
        "id"         SERIAL NOT NULL,
        "usuario_id" INTEGER NOT NULL,
        "contenido"  TEXT NOT NULL,
        "fecha"      TIMESTAMP NOT NULL DEFAULT now(),
        "fijado"     BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_mensajes" PRIMARY KEY ("id")
      )
    `);

    // ─── MENSAJE IMAGENES ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "mensaje_imagenes" (
        "id"         SERIAL NOT NULL,
        "mensaje_id" INTEGER NOT NULL,
        "url_imagen" CHARACTER VARYING(500) NOT NULL,
        CONSTRAINT "PK_mensaje_imagenes" PRIMARY KEY ("id")
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // FOREIGN KEYS
    // ═══════════════════════════════════════════════════════════════════════

    // hibridos → cultivos
    await queryRunner.query(`
      ALTER TABLE "hibridos"
        ADD CONSTRAINT "FK_hibridos_cultivo_id"
        FOREIGN KEY ("cultivo_id")
        REFERENCES "cultivos"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // bandas → cultivos
    await queryRunner.query(`
      ALTER TABLE "bandas"
        ADD CONSTRAINT "FK_bandas_cultivo_id"
        FOREIGN KEY ("cultivo_id")
        REFERENCES "cultivos"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // precios → hibridos
    await queryRunner.query(`
      ALTER TABLE "precios"
        ADD CONSTRAINT "FK_precios_hibrido_id"
        FOREIGN KEY ("hibrido_id")
        REFERENCES "hibridos"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // precios → bandas
    await queryRunner.query(`
      ALTER TABLE "precios"
        ADD CONSTRAINT "FK_precios_banda_id"
        FOREIGN KEY ("banda_id")
        REFERENCES "bandas"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // descuentos_volumen → cultivos
    await queryRunner.query(`
      ALTER TABLE "descuentos_volumen"
        ADD CONSTRAINT "FK_descuentos_volumen_cultivo_id"
        FOREIGN KEY ("cultivo_id")
        REFERENCES "cultivos"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // cotizaciones → clientes
    await queryRunner.query(`
      ALTER TABLE "cotizaciones"
        ADD CONSTRAINT "FK_cotizaciones_cliente_id"
        FOREIGN KEY ("cliente_id")
        REFERENCES "clientes"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // cotizaciones → usuarios
    await queryRunner.query(`
      ALTER TABLE "cotizaciones"
        ADD CONSTRAINT "FK_cotizaciones_usuario_id"
        FOREIGN KEY ("usuario_id")
        REFERENCES "usuarios"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // cotizacion_versiones → cotizaciones
    await queryRunner.query(`
      ALTER TABLE "cotizacion_versiones"
        ADD CONSTRAINT "FK_cotizacion_versiones_cotizacion_id"
        FOREIGN KEY ("cotizacion_id")
        REFERENCES "cotizaciones"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // cotizacion_versiones → usuarios
    await queryRunner.query(`
      ALTER TABLE "cotizacion_versiones"
        ADD CONSTRAINT "FK_cotizacion_versiones_usuario_id"
        FOREIGN KEY ("usuario_id")
        REFERENCES "usuarios"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // cotizacion_items → cotizacion_versiones
    await queryRunner.query(`
      ALTER TABLE "cotizacion_items"
        ADD CONSTRAINT "FK_cotizacion_items_version_id"
        FOREIGN KEY ("version_id")
        REFERENCES "cotizacion_versiones"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // cotizacion_items → cultivos
    await queryRunner.query(`
      ALTER TABLE "cotizacion_items"
        ADD CONSTRAINT "FK_cotizacion_items_cultivo_id"
        FOREIGN KEY ("cultivo_id")
        REFERENCES "cultivos"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // cotizacion_items → hibridos
    await queryRunner.query(`
      ALTER TABLE "cotizacion_items"
        ADD CONSTRAINT "FK_cotizacion_items_hibrido_id"
        FOREIGN KEY ("hibrido_id")
        REFERENCES "hibridos"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // cotizacion_items → bandas
    await queryRunner.query(`
      ALTER TABLE "cotizacion_items"
        ADD CONSTRAINT "FK_cotizacion_items_banda_id"
        FOREIGN KEY ("banda_id")
        REFERENCES "bandas"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // cotizacion_item_descuentos → cotizacion_items
    await queryRunner.query(`
      ALTER TABLE "cotizacion_item_descuentos"
        ADD CONSTRAINT "FK_cotizacion_item_descuentos_item_id"
        FOREIGN KEY ("cotizacion_item_id")
        REFERENCES "cotizacion_items"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // cotizacion_item_descuentos → descuentos
    await queryRunner.query(`
      ALTER TABLE "cotizacion_item_descuentos"
        ADD CONSTRAINT "FK_cotizacion_item_descuentos_descuento_id"
        FOREIGN KEY ("descuento_id")
        REFERENCES "descuentos"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // cotizacion_descuentos → cotizacion_versiones
    await queryRunner.query(`
      ALTER TABLE "cotizacion_descuentos"
        ADD CONSTRAINT "FK_cotizacion_descuentos_version_id"
        FOREIGN KEY ("version_id")
        REFERENCES "cotizacion_versiones"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // cotizacion_descuentos → descuentos
    await queryRunner.query(`
      ALTER TABLE "cotizacion_descuentos"
        ADD CONSTRAINT "FK_cotizacion_descuentos_descuento_id"
        FOREIGN KEY ("descuento_id")
        REFERENCES "descuentos"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // mensajes → usuarios
    await queryRunner.query(`
      ALTER TABLE "mensajes"
        ADD CONSTRAINT "FK_mensajes_usuario_id"
        FOREIGN KEY ("usuario_id")
        REFERENCES "usuarios"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // mensaje_imagenes → mensajes
    await queryRunner.query(`
      ALTER TABLE "mensaje_imagenes"
        ADD CONSTRAINT "FK_mensaje_imagenes_mensaje_id"
        FOREIGN KEY ("mensaje_id")
        REFERENCES "mensajes"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // ÍNDICES DE PERFORMANCE
    // ═══════════════════════════════════════════════════════════════════════

    // Precio vigente: buscar por (hibrido, banda) y ordenar por fecha desc
    await queryRunner.query(`
      CREATE INDEX "IDX_precios_hibrido_banda_fecha"
        ON "precios" ("hibrido_id", "banda_id", "fecha" DESC)
    `);

    // Historial de descuento por nombre
    await queryRunner.query(`
      CREATE INDEX "IDX_descuentos_nombre_fecha"
        ON "descuentos" ("nombre", "fecha" DESC)
    `);

    // Descuentos de volumen vigentes por cultivo
    await queryRunner.query(`
      CREATE INDEX "IDX_descuentos_volumen_cultivo_fecha"
        ON "descuentos_volumen" ("cultivo_id", "fecha" DESC)
    `);

    // Cotizaciones por cliente
    await queryRunner.query(`
      CREATE INDEX "IDX_cotizaciones_cliente_id"
        ON "cotizaciones" ("cliente_id")
    `);

    // Cotizaciones por usuario
    await queryRunner.query(`
      CREATE INDEX "IDX_cotizaciones_usuario_id"
        ON "cotizaciones" ("usuario_id")
    `);

    // Cotizaciones por estado
    await queryRunner.query(`
      CREATE INDEX "IDX_cotizaciones_estado"
        ON "cotizaciones" ("estado")
    `);

    // Versión más reciente de una cotización
    await queryRunner.query(`
      CREATE INDEX "IDX_cotizacion_versiones_cotizacion_version"
        ON "cotizacion_versiones" ("cotizacion_id", "version" DESC)
    `);

    // Items de una versión
    await queryRunner.query(`
      CREATE INDEX "IDX_cotizacion_items_version_id"
        ON "cotizacion_items" ("version_id")
    `);

    // Mensajes fijados
    await queryRunner.query(`
      CREATE INDEX "IDX_mensajes_fijado"
        ON "mensajes" ("fijado")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Índices
    await queryRunner.query(`DROP INDEX "IDX_mensajes_fijado"`);
    await queryRunner.query(`DROP INDEX "IDX_cotizacion_items_version_id"`);
    await queryRunner.query(`DROP INDEX "IDX_cotizacion_versiones_cotizacion_version"`);
    await queryRunner.query(`DROP INDEX "IDX_cotizaciones_estado"`);
    await queryRunner.query(`DROP INDEX "IDX_cotizaciones_usuario_id"`);
    await queryRunner.query(`DROP INDEX "IDX_cotizaciones_cliente_id"`);
    await queryRunner.query(`DROP INDEX "IDX_descuentos_volumen_cultivo_fecha"`);
    await queryRunner.query(`DROP INDEX "IDX_descuentos_nombre_fecha"`);
    await queryRunner.query(`DROP INDEX "IDX_precios_hibrido_banda_fecha"`);

    // Foreign keys + tablas (orden inverso a la creación)
    await queryRunner.query(`ALTER TABLE "mensaje_imagenes" DROP CONSTRAINT "FK_mensaje_imagenes_mensaje_id"`);
    await queryRunner.query(`ALTER TABLE "mensajes" DROP CONSTRAINT "FK_mensajes_usuario_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_descuentos" DROP CONSTRAINT "FK_cotizacion_descuentos_descuento_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_descuentos" DROP CONSTRAINT "FK_cotizacion_descuentos_version_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_item_descuentos" DROP CONSTRAINT "FK_cotizacion_item_descuentos_descuento_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_item_descuentos" DROP CONSTRAINT "FK_cotizacion_item_descuentos_item_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_items" DROP CONSTRAINT "FK_cotizacion_items_banda_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_items" DROP CONSTRAINT "FK_cotizacion_items_hibrido_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_items" DROP CONSTRAINT "FK_cotizacion_items_cultivo_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_items" DROP CONSTRAINT "FK_cotizacion_items_version_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_versiones" DROP CONSTRAINT "FK_cotizacion_versiones_usuario_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_versiones" DROP CONSTRAINT "FK_cotizacion_versiones_cotizacion_id"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP CONSTRAINT "FK_cotizaciones_usuario_id"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP CONSTRAINT "FK_cotizaciones_cliente_id"`);
    await queryRunner.query(`ALTER TABLE "descuentos_volumen" DROP CONSTRAINT "FK_descuentos_volumen_cultivo_id"`);
    await queryRunner.query(`ALTER TABLE "precios" DROP CONSTRAINT "FK_precios_banda_id"`);
    await queryRunner.query(`ALTER TABLE "precios" DROP CONSTRAINT "FK_precios_hibrido_id"`);
    await queryRunner.query(`ALTER TABLE "bandas" DROP CONSTRAINT "FK_bandas_cultivo_id"`);
    await queryRunner.query(`ALTER TABLE "hibridos" DROP CONSTRAINT "FK_hibridos_cultivo_id"`);

    // Tablas
    await queryRunner.query(`DROP TABLE "mensaje_imagenes"`);
    await queryRunner.query(`DROP TABLE "mensajes"`);
    await queryRunner.query(`DROP TABLE "cotizacion_descuentos"`);
    await queryRunner.query(`DROP TABLE "cotizacion_item_descuentos"`);
    await queryRunner.query(`DROP TABLE "cotizacion_items"`);
    await queryRunner.query(`DROP TABLE "cotizacion_versiones"`);
    await queryRunner.query(`DROP TABLE "cotizaciones"`);
    await queryRunner.query(`DROP TABLE "descuentos_volumen"`);
    await queryRunner.query(`DROP TABLE "descuentos"`);
    await queryRunner.query(`DROP TABLE "precios"`);
    await queryRunner.query(`DROP TABLE "bandas"`);
    await queryRunner.query(`DROP TABLE "hibridos"`);
    await queryRunner.query(`DROP TABLE "cultivos"`);
    await queryRunner.query(`DROP TABLE "clientes"`);
    await queryRunner.query(`DROP TABLE "usuarios"`);

    // ENUMs
    await queryRunner.query(`DROP TYPE "public"."cotizaciones_estado_enum"`);
    await queryRunner.query(`DROP TYPE "public"."usuarios_rol_enum"`);
  }
}
