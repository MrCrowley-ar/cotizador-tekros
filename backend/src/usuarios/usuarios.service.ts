import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from './usuario.entity';

const SALT_ROUNDS = 10;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  async findAll(): Promise<Omit<Usuario, 'password'>[]> {
    return this.repo.find({
      select: ['id', 'nombre', 'email', 'rol', 'activo', 'fechaCreacion'],
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Usuario> {
    const usuario = await this.repo.findOne({
      where: { id },
      select: ['id', 'nombre', 'email', 'rol', 'activo', 'fechaCreacion'],
    });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return usuario;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { email } });
  }

  async create(dto: CreateUsuarioDto): Promise<Omit<Usuario, 'password'>> {
    const existe = await this.repo.findOneBy({ email: dto.email });
    if (existe) throw new ConflictException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const usuario = this.repo.create({ ...dto, password: hash });
    const saved = await this.repo.save(usuario);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...rest } = saved;
    return rest as Usuario;
  }

  async update(id: number, dto: UpdateUsuarioDto): Promise<Omit<Usuario, 'password'>> {
    const usuario = await this.repo.findOneBy({ id });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);

    if (dto.password) {
      dto = { ...dto, password: await bcrypt.hash(dto.password, SALT_ROUNDS) };
    }

    Object.assign(usuario, dto);
    const saved = await this.repo.save(usuario);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...rest } = saved;
    return rest as Usuario;
  }
}
