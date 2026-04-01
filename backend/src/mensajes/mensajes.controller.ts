import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { MensajesService } from './mensajes.service';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller('mensajes')
export class MensajesController {
  constructor(private readonly service: MensajesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateMensajeDto, @CurrentUser() user: Usuario) {
    return this.service.create(dto, user.id);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          return cb(new BadRequestException('Tipo de archivo no permitido'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_SIZE },
    }),
  )
  uploadImagen(@UploadedFile() file: any): { url: string } {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return { url: `/uploads/${file.filename}` };
  }

  @Patch(':id/toggle-fijado')
  toggleFijado(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Usuario) {
    return this.service.toggleFijado(id, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user.id);
  }
}
