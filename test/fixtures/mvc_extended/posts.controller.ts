import { Controller, Post, Body, Res } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  createPost(@Body() body: any, @Res() res: any) {
    // Source: body.content (User Input)
    // We call a service method that writes to res
    return this.postsService.publish(body.content, res);
  }
}
