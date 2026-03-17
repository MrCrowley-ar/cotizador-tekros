import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHistorialAcciones1742215300000 implements MigrationInterface {
  name = 'AddHistorialAcciones1742215300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."historial_acciones_tipo_entidad_enum" AS ENUM(
        'cotizacion', 'cotizacion_version', 'cotizacion_item',
        'cliente', 'usuario', 'precio', 'descuento', 'descuento_volumen',
        'cultivo', 'hibrido', 'banda', 'mensaje'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."historial_acciones_tipo_accion_enum" AS ENUM(
        'crear', 'actualizar', 'eliminar',
        'cambiar_estado', 'nueva_version',
        'agregar_item', 'eliminar_item',
        'agregar_descuento', 'eliminar_descuento',
        'registrar_precio',
        'activar', 'desactivar',
        'fijar', 'desfijar'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "historial_acciones" (
        "id"            SERIAL NOT NULL,
        "usuario_id"    INTEGER,
        "cotizacion_id" INTEGER,
        "tipo_entidad"  "public"."historial_acciones_tipo_entidad_enum" NOT NULL,
        "tipo_accion"   "public"."historial_acciones_tipo_accion_enum" NOT NULL,
        "entidad_id"    INTEGER,
        "descripcion"   CHARACTER VARYING(500) NOT NULL,
        "datos_previos" JSONB,
        "datos_nuevos"  JSONB,
        "fecha"         TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_historial_acciones" PRIMARY KEY ("id")
      )
    `);

    // FK → usuarios (SET NULL si se borra el usuario)
    await queryRunner.query(`
      ALTER TABLE "historial_acciones"
        ADD CONSTRAINT "FK_historial_acciones_usuario_id"
        FOREIGN KEY ("usuario_id")
        REFERENCES "usuarios"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // FK → cotizaciones (SET NULL si se borra la cotización, sin cascada destructiva)
    await queryRunner.query(`
      ALTER TABLE "historial_acciones"
        ADD CONSTRAINT "FK_historial_acciones_cotizacion_id"
        FOREIGN KEY ("cotizacion_id")
        REFERENCES "cotizaciones"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // Índice para consultar historial por cotización
    await queryRunner.query(`
      CREATE INDEX "IDX_historial_acciones_cotizacion_id"
        ON "historial_acciones" ("cotizacion_id", "fecha" DESC)
    `);

    // Índice para consultar acciones por usuario
    await queryRunner.query(`
      CREATE INDEX "IDX_historial_acciones_usuario_id"
        ON "historial_acciones" ("usuario_id", "fecha" DESC)
    `);

    // Índice para consultar por tipo de entidad (ej: todos los cambios de precios)
    await queryRunner.query(`
      CREATE INDEX "IDX_historial_acciones_tipo_entidad"
        ON "historial_acciones" ("tipo_entidad", "fecha" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_historial_acciones_tipo_entidad"`);
    await queryRunner.query(`DROP INDEX "IDX_historial_acciones_usuario_id"`);
    await queryRunner.query(`DROP INDEX "IDX_historial_acciones_cotizacion_id"`);
    await queryRunner.query(`ALTER TABLE "historial_acciones" DROP CONSTRAINT "FK_historial_acciones_cotizacion_id"`);
    await queryRunner.query(`ALTER TABLE "historial_acciones" DROP CONSTRAINT "FK_historial_acciones_usuario_id"`);
    await queryRunner.query(`DROP TABLE "historial_acciones"`);
    await queryRunner.query(`DROP TYPE "public"."historial_acciones_tipo_accion_enum"`);
    await queryRunner.query(`DROP TYPE "public"."historial_acciones_tipo_entidad_enum"`);
  }
}
