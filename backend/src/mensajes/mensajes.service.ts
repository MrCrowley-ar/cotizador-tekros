import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoAccion, TipoEntidad } from '../historial/historial-accion.entity';
import { HistorialService } from '../historial/historial.service';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { MensajeImagen } from './mensaje-imagen.entity';
import { Mensaje } from './mensaje.entity';

@Injectable()
export class MensajesService {
  constructor(
    @InjectRepository(Mensaje)
    private readonly mensajeRepo: Repository<Mensaje>,
    @InjectRepository(MensajeImagen)
    private readonly imagenRepo: Repository<MensajeImagen>,
    private readonly historialService: HistorialService,
  ) {}

  findAll(): Promise<Mensaje[]> {
    return this.mensajeRepo.find({
      relations: ['usuario', 'imagenes'],
      order: { fijado: 'DESC', fecha: 'DESC' },
    });
  }

  async create(dto: CreateMensajeDto): Promise<Mensaje> {
    const mensaje = await this.mensajeRepo.save(
      this.mensajeRepo.create({
        usuarioId: dto.usuarioId,
        contenido: dto.contenido,
      }),
    );

    if (dto.imagenes?.length) {
      await this.imagenRepo.save(
        dto.imagenes.map((url) =>
          this.imagenRepo.create({ mensajeId: mensaje.id, urlImagen: url }),
        ),
      );
    }

    await this.historialService.registrar({
      usuarioId: dto.usuarioId,
      tipoEntidad: TipoEntidad.MENSAJE,
      tipoAccion: TipoAccion.CREAR,
      entidadId: mensaje.id,
      descripcion: `Mensaje creado por usuario ${dto.usuarioId}`,
      datosNuevos: { contenido: dto.contenido.substring(0, 100) },
    });

    return this.mensajeRepo.findOne({
      where: { id: mensaje.id },
      relations: ['usuario', 'imagenes'],
    }) as Promise<Mensaje>;
  }

  async toggleFijado(id: number, usuarioId?: number): Promise<Mensaje> {
    const mensaje = await this.mensajeRepo.findOneBy({ id });
    if (!mensaje) throw new NotFoundException(`Mensaje ${id} no encontrado`);

    mensaje.fijado = !mensaje.fijado;
    const updated = await this.mensajeRepo.save(mensaje);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? mensaje.usuarioId,
      tipoEntidad: TipoEntidad.MENSAJE,
      tipoAccion: mensaje.fijado ? TipoAccion.FIJAR : TipoAccion.DESFIJAR,
      entidadId: id,
      descripcion: `Mensaje ${id} ${mensaje.fijado ? 'fijado' : 'desfijado'}`,
    });

    return updated;
  }

  async remove(id: number, usuarioId?: number): Promise<void> {
    const mensaje = await this.mensajeRepo.findOneBy({ id });
    if (!mensaje) throw new NotFoundException(`Mensaje ${id} no encontrado`);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? mensaje.usuarioId,
      tipoEntidad: TipoEntidad.MENSAJE,
      tipoAccion: TipoAccion.ELIMINAR,
      entidadId: id,
      descripcion: `Mensaje ${id} eliminado`,
      datosPrevios: { contenido: mensaje.contenido.substring(0, 100) },
    });

    await this.mensajeRepo.remove(mensaje);
  }
}
