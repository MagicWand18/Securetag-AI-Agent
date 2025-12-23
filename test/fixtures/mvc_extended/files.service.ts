import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class FilesService {
  read(filePath: string) {
    // Sink: fs.readFileSync (Path Traversal)
    return fs.readFileSync(filePath, 'utf8');
  }
}
