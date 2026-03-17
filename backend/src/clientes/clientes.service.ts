import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Cliente } from './cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly repo: Repository<Cliente>,
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
    const cliente = this.repo.create(dto);
    return this.repo.save(cliente);
  }

  async update(id: number, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.findOne(id);
    if (dto.cuit && dto.cuit !== cliente.cuit) {
      const existe = await this.repo.findOneBy({ cuit: dto.cuit });
      if (existe) throw new ConflictException('El CUIT ya está registrado');
    }
    Object.assign(cliente, dto);
    return this.repo.save(cliente);
  }
}
