import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from './usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  async findAll(): Promise<Usuario[]> {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Usuario> {
    const usuario = await this.repo.findOneBy({ id });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return usuario;
  }

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const existe = await this.repo.findOneBy({ email: dto.email });
    if (existe) throw new ConflictException('El email ya está registrado');
    const usuario = this.repo.create(dto);
    return this.repo.save(usuario);
  }

  async update(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.findOne(id);
    Object.assign(usuario, dto);
    return this.repo.save(usuario);
  }
}
