import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { UserService } from './user.service';
import * as fs from 'fs';
import * as child_process from 'child_process';
import axios from 'axios';
import * as libxmljs from 'libxmljs';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: any) {
    // Source: Controller
    this.userService.create(createUserDto); // Call: Service
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Source: Controller
    return this.userService.findOne(id); // Call: Service
  }
}

export class UserService {
  constructor(private db: any) {}

  create(data: any) {
    // Sink: SQLi
    this.db.query(`INSERT INTO users VALUES (${data.name})`);
    
    // Sink: CMDi
    child_process.exec(`echo ${data.name}`);
    
    // Sink: Code Eval
    eval(data.code);
    
    // Sink: SSRF
    axios.get(data.url);
    
    // Sink: Path Traversal
    fs.readFile(data.path, 'utf8', () => {});
    
    // Sink: NoSQLi
    this.db.collection('users').find({$where: `this.age > ${data.age}`});
    
    // Sink: Deserialization
    // Mock node_serialize
    const node_serialize = { unserialize: (x) => {} };
    node_serialize.unserialize(data.obj);
    
    // Sink: Proto Pollution
    // Object.assign is often used for this
    Object.assign({}, data);
    
    // Sink: SSTI
    const res = { render: (v, d) => {}, send: (x) => {} };
    res.render('template', data);
    
    // Sink: XXE
    libxmljs.parseXml(data.xml);

    // Sink: Mass Assignment
    const User = { create: (x) => {} };
    User.create(data);
    
    // Sink: BOLA
    this.db.findOne(data.id);
    
    // Sink: File Upload
    fs.writeFile(data.filename, data.content, () => {});
    
    // Sink: Weak Crypto
    const token = Math.random();
    
    // Sink: Log Injection
    console.log(data.input);

    // Sink: Reflected XSS
    res.send(data.input);
  }
}
