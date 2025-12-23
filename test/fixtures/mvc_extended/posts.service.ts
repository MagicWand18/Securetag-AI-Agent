import { Injectable } from '@nestjs/common';

@Injectable()
export class PostsService {
  publish(content: string, res: any) {
     // Sink: Reflected XSS
     res.send(`<h1>${content}</h1>`); 
  }
}
