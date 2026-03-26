import { Injectable } from '@nestjs/common';
import { CampoCondicion, DescuentoCondicion, OperadorCondicion } from './descuento-condicion.entity';
import { DescuentoRegla } from './descuento-regla.entity';
import { Descuento, ModoDescuento, TipoAplicacion } from './descuento.entity';
import { DescuentosService } from './descuentos.service';

export interface ContextoDescuento {
  cantidad?: number;
  cultivoId?: number;
  hibridoId?: number;
  bandaId?: number;
  precio?: number;    // precio base del ítem
  subtotal?: number;  // precio * bolsas
}

export interface DescuentoAplicado {
  descuentoId: number;
  nombre: string;
  porcentaje: number;
  modo: ModoDescuento;
  reglaId?: number; // solo en modo avanzado
}

@Injectable()
export class DescuentoEvaluadorService {
  constructor(private readonly descuentosService: DescuentosService) {}

  /**
   * Evalúa todos los descuentos activos para un tipo de aplicación dado
   * y devuelve los que aplican según el contexto.
   *
   * Estrategia multi-regla: se aplica la PRIMERA regla (por prioridad asc)
   * cuyas condiciones se cumplan todas (AND lógico).
   */
  async evaluar(
    contexto: ContextoDescuento,
    tipoAplicacion: TipoAplicacion,
  ): Promise<DescuentoAplicado[]> {
    const descuentos = await this.descuentosService.findActivosPorTipo(tipoAplicacion);
    const aplicados: DescuentoAplicado[] = [];

    for (const descuento of descuentos) {
      const resultado = this.evaluarDescuento(descuento, contexto);
      if (resultado !== null) {
        aplicados.push(resultado);
      }
    }

    return aplicados;
  }

  private evaluarDescuento(
    descuento: Descuento,
    contexto: ContextoDescuento,
  ): DescuentoAplicado | null {
    if (descuento.modo === ModoDescuento.BASICO) {
      if (descuento.valorPorcentaje == null) return null;
      return {
        descuentoId: descuento.id,
        nombre: descuento.nombre,
        porcentaje: Number(descuento.valorPorcentaje),
        modo: ModoDescuento.BASICO,
      };
    }

    // Modo avanzado: recorrer reglas ordenadas por prioridad (asc)
    const reglas: DescuentoRegla[] = [...(descuento.reglas ?? [])].sort(
      (a, b) => a.prioridad - b.prioridad,
    );

    for (const regla of reglas) {
      if (this.evaluarRegla(regla, contexto)) {
        return {
          descuentoId: descuento.id,
          nombre: descuento.nombre,
          porcentaje: Number(regla.valor),
          modo: ModoDescuento.AVANZADO,
          reglaId: regla.id,
        };
      }
    }

    return null; // ninguna regla aplicó
  }

  // Todas las condiciones de la regla deben cumplirse (AND)
  private evaluarRegla(regla: DescuentoRegla, contexto: ContextoDescuento): boolean {
    const condiciones: DescuentoCondicion[] = regla.condiciones ?? [];
    if (condiciones.length === 0) return true; // sin condiciones → siempre aplica

    return condiciones.every((c) => this.evaluarCondicion(c, contexto));
  }

  private evaluarCondicion(c: DescuentoCondicion, ctx: ContextoDescuento): boolean {
    const valorContexto = this.getValorContexto(c.campo, ctx);
    if (valorContexto === undefined) return false;

    const v = Number(c.valor);
    const v2 = c.valor2 !== null ? Number(c.valor2) : null;

    switch (c.operador) {
      case OperadorCondicion.EQ:    return valorContexto === v;
      case OperadorCondicion.NEQ:   return valorContexto !== v;
      case OperadorCondicion.GT:    return valorContexto > v;
      case OperadorCondicion.LT:    return valorContexto < v;
      case OperadorCondicion.GTE:   return valorContexto >= v;
      case OperadorCondicion.LTE:   return valorContexto <= v;
      case OperadorCondicion.ENTRE: return v2 !== null && valorContexto >= v && valorContexto <= v2;
      default:                      return false;
    }
  }

  private getValorContexto(campo: CampoCondicion, ctx: ContextoDescuento): number | undefined {
    switch (campo) {
      case CampoCondicion.CANTIDAD:   return ctx.cantidad;
      case CampoCondicion.CULTIVO_ID: return ctx.cultivoId;
      case CampoCondicion.HIBRIDO_ID: return ctx.hibridoId;
      case CampoCondicion.BANDA_ID:   return ctx.bandaId;
      case CampoCondicion.PRECIO:     return ctx.precio;
      case CampoCondicion.SUBTOTAL:   return ctx.subtotal;
      default:                        return undefined;
    }
  }
}
