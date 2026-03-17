import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    return this.mensajeRepo.findOne({
      where: { id: mensaje.id },
      relations: ['usuario', 'imagenes'],
    }) as Promise<Mensaje>;
  }

  async toggleFijado(id: number): Promise<Mensaje> {
    const mensaje = await this.mensajeRepo.findOneBy({ id });
    if (!mensaje) throw new NotFoundException(`Mensaje ${id} no encontrado`);
    mensaje.fijado = !mensaje.fijado;
    return this.mensajeRepo.save(mensaje);
  }

  async remove(id: number): Promise<void> {
    const mensaje = await this.mensajeRepo.findOneBy({ id });
    if (!mensaje) throw new NotFoundException(`Mensaje ${id} no encontrado`);
    await this.mensajeRepo.remove(mensaje);
  }
}
