import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { TipoAccion, TipoEntidad } from '../historial/historial-accion.entity';
import { HistorialService } from '../historial/historial.service';
import { Cliente } from './cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly repo: Repository<Cliente>,
    private readonly historialService: HistorialService,
  ) {}

  async findAll(search?: string): Promise<Cliente[]> {
    if (search) {
      return this.repo.find({
        where: [{ nombre: ILike(`%${search}%`) }, { cuit: ILike(`%${search}%`) }],
        order: { nombre: 'ASC' },
      });
    }
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Cliente> {
    const cliente = await this.repo.findOneBy({ id });
    if (!cliente) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return cliente;
  }

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const existe = await this.repo.findOneBy({ cuit: dto.cuit });
    if (existe) throw new ConflictException('El CUIT ya está registrado');

    const { usuarioId, ...clienteData } = dto;
    const cliente = await this.repo.save(this.repo.create(clienteData));

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.CLIENTE,
      tipoAccion: TipoAccion.CREAR,
      entidadId: cliente.id,
      descripcion: `Cliente "${cliente.nombre}" (CUIT: ${cliente.cuit}) creado`,
      datosNuevos: { nombre: cliente.nombre, cuit: cliente.cuit },
    });

    return cliente;
  }

  async update(id: number, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.findOne(id);
    if (dto.cuit && dto.cuit !== cliente.cuit) {
      const existe = await this.repo.findOneBy({ cuit: dto.cuit });
      if (existe) throw new ConflictException('El CUIT ya está registrado');
    }

    const { usuarioId, ...updateData } = dto;
    const previo = { nombre: cliente.nombre, cuit: cliente.cuit, activo: cliente.activo };
    Object.assign(cliente, updateData);
    const updated = await this.repo.save(cliente);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.CLIENTE,
      tipoAccion: TipoAccion.ACTUALIZAR,
      entidadId: id,
      descripcion: `Cliente "${cliente.nombre}" actualizado`,
      datosPrevios: previo,
      datosNuevos: updateData,
    });

    return updated;
  }
}
