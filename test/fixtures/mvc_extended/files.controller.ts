import { Controller, Get, Query } from '@nestjs/common';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  getFile(@Query('path') path: string) {
    // Source: path (User Input)
    return this.filesService.read(path);
  }
}
