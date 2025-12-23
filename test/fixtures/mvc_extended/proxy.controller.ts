import { Controller, Post, Body } from '@nestjs/common';
import { ProxyService } from './proxy.service';

@Controller('proxy')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('fetch')
  fetchUrl(@Body('url') url: string) {
    // Source: url (User Input)
    return this.proxyService.makeRequest(url);
  }
}
