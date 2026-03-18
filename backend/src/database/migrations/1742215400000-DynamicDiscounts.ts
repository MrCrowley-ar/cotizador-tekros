import { MigrationInterface, QueryRunner } from 'typeorm';

export class DynamicDiscounts1742215400000 implements MigrationInterface {
  name = 'DynamicDiscounts1742215400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ─── New ENUMs ────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TYPE descuentos_tipo_aplicacion_enum AS ENUM ('global', 'cultivo', 'hibrido')
    `);

    await queryRunner.query(`
      CREATE TYPE descuentos_modo_enum AS ENUM ('basico', 'avanzado')
    `);

    await queryRunner.query(`
      CREATE TYPE descuento_condiciones_campo_enum
        AS ENUM ('cantidad', 'cultivo_id', 'hibrido_id', 'banda_id')
    `);

    await queryRunner.query(`
      CREATE TYPE descuento_condiciones_operador_enum
        AS ENUM ('=', '!=', '>', '<', '>=', '<=', 'entre')
    `);

    // ─── Alter descuentos table ───────────────────────────────────────────────

    // Add tipo_aplicacion column (default 'global' keeps existing rows valid)
    await queryRunner.query(`
      ALTER TABLE descuentos
        ADD COLUMN tipo_aplicacion descuentos_tipo_aplicacion_enum NOT NULL DEFAULT 'global'
    `);

    // Add modo column (default 'basico' keeps existing rows valid)
    await queryRunner.query(`
      ALTER TABLE descuentos
        ADD COLUMN modo descuentos_modo_enum NOT NULL DEFAULT 'basico'
    `);

    // Rename fecha → fecha_vigencia
    await queryRunner.query(`
      ALTER TABLE descuentos RENAME COLUMN fecha TO fecha_vigencia
    `);

    // Make valor_porcentaje nullable (avanzado mode has no direct %%)
    await queryRunner.query(`
      ALTER TABLE descuentos ALTER COLUMN valor_porcentaje DROP NOT NULL
    `);

    // ─── descuento_reglas ─────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE descuento_reglas (
        id         SERIAL PRIMARY KEY,
        descuento_id INTEGER NOT NULL,
        valor      NUMERIC(5,2) NOT NULL,
        prioridad  INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_regla_descuento
          FOREIGN KEY (descuento_id) REFERENCES descuentos(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reglas_descuento ON descuento_reglas(descuento_id)
    `);

    // ─── descuento_condiciones ────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE descuento_condiciones (
        id        SERIAL PRIMARY KEY,
        regla_id  INTEGER NOT NULL,
        campo     descuento_condiciones_campo_enum NOT NULL,
        operador  descuento_condiciones_operador_enum NOT NULL,
        valor     NUMERIC(12,4) NOT NULL,
        valor_2   NUMERIC(12,4),
        CONSTRAINT fk_condicion_regla
          FOREIGN KEY (regla_id) REFERENCES descuento_reglas(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_condiciones_regla ON descuento_condiciones(regla_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS descuento_condiciones`);
    await queryRunner.query(`DROP TABLE IF EXISTS descuento_reglas`);

    await queryRunner.query(`ALTER TABLE descuentos ALTER COLUMN valor_porcentaje SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE descuentos RENAME COLUMN fecha_vigencia TO fecha`);
    await queryRunner.query(`ALTER TABLE descuentos DROP COLUMN IF EXISTS modo`);
    await queryRunner.query(`ALTER TABLE descuentos DROP COLUMN IF EXISTS tipo_aplicacion`);

    await queryRunner.query(`DROP TYPE IF EXISTS descuento_condiciones_operador_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS descuento_condiciones_campo_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS descuentos_modo_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS descuentos_tipo_aplicacion_enum`);
  }
}
