import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; usuario: object }> {
    const usuario = await this.usuariosService.findByEmail(dto.email);
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');
    if (!usuario.activo) throw new UnauthorizedException('Usuario inactivo');

    const passwordOk = await bcrypt.compare(dto.password, usuario.password);
    if (!passwordOk) throw new UnauthorizedException('Credenciales inválidas');

    const payload: JwtPayload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }
}
