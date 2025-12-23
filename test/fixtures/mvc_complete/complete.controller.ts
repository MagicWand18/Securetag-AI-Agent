import { Controller, Post, Get, Body, Query, Param, Put, UploadedFile } from '@nestjs/common';
import { CompleteService } from './complete.service';

@Controller('complete')
export class CompleteController {
  constructor(private readonly completeService: CompleteService) {}

  @Post('sql')
  async testSql(@Body() body: any) {
    return this.completeService.unsafeSql(body.id);
  }

  @Post('cmd')
  async testCmd(@Body() body: any) {
    return this.completeService.unsafeCmd(body.command);
  }

  @Post('code')
  async testCode(@Body() body: any) {
    return this.completeService.unsafeCode(body.code);
  }

  @Post('ssrf')
  async testSsrf(@Body() body: any) {
    return this.completeService.unsafeSsrf(body.url);
  }

  @Get('path')
  async testPath(@Query() query: any) {
    return this.completeService.unsafePath(query.file);
  }

  @Post('nosql')
  async testNoSql(@Body() body: any) {
    return this.completeService.unsafeNoSql(body.filter);
  }

  @Post('deserial')
  async testDeserial(@Body() body: any) {
    return this.completeService.unsafeDeserial(body.payload);
  }

  @Post('proto')
  async testProto(@Body() body: any) {
    return this.completeService.unsafeProto(body.json);
  }

  @Get('ssti')
  async testSsti(@Query() query: any) {
    return this.completeService.unsafeSsti(query.template);
  }

  @Post('xxe')
  async testXxe(@Body() body: any) {
    return this.completeService.unsafeXxe(body.xml);
  }

  @Post('mass')
  async testMass(@Body() body: any) {
    return this.completeService.unsafeMass(body);
  }

  @Get('bola/:id')
  async testBola(@Param() params: any) {
    return this.completeService.unsafeBola(params.id);
  }

  @Post('upload')
  async testUpload(@UploadedFile() file: any) {
    return this.completeService.unsafeUpload(file);
  }

  @Get('crypto')
  async testCrypto(@Query() query: any) {
    return this.completeService.unsafeCrypto(query.password);
  }

  @Get('xss')
  async testXss(@Query() query: any) {
    return this.completeService.unsafeXss(query.input);
  }

  @Post('log')
  async testLog(@Body() body: any) {
    return this.completeService.unsafeLog(body.message);
  }

  @Get('redirect')
  async testRedirect(@Query() query: any) {
    return this.completeService.unsafeRedirect(query.url);
  }
}
