import { Injectable } from '@nestjs/common';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as axios from 'axios';
import * as node_serialize from 'node_serialize';
import * as _ from 'lodash';
import * as libxmljs from 'libxmljs';
import * as crypto from 'crypto';

@Injectable()
export class CompleteService {
  constructor(private db: any, private repo: any, private res: any) {}

  async unsafeSql(id: string) {
    return this.db.query(`SELECT * FROM users WHERE id = ${id}`);
  }

  async unsafeCmd(command: string) {
    return child_process.exec(command);
  }

  async unsafeCode(code: string) {
    return eval(code);
  }

  async unsafeSsrf(url: string) {
    return axios.get(url);
  }

  async unsafePath(file: string) {
    return fs.readFileSync(file);
  }

  async unsafeNoSql(filter: string) {
    return this.db.collection('users').find({ $where: filter });
  }

  async unsafeDeserial(payload: string) {
    return node_serialize.unserialize(payload);
  }

  async unsafeProto(json: any) {
    const target = {};
    return _.merge(target, json);
  }

  async unsafeSsti(template: string) {
    return this.res.render(template);
  }

  async unsafeXxe(xml: string) {
    return libxmljs.parseXml(xml, { noblanks: true, noent: true, nocdata: true });
  }

  async unsafeMass(data: any) {
    return this.repo.create(data);
  }

  async unsafeBola(id: string) {
    // Missing ownership check
    return this.repo.findOne(id);
  }

  async unsafeUpload(file: any) {
    return file.mv(`/uploads/${file.name}`);
  }

  async unsafeCrypto(password: string) {
    return crypto.createHash('md5').update(password).digest('hex');
  }

  async unsafeXss(input: string) {
    return this.res.send(input);
  }

  async unsafeLog(message: string) {
    console.log(message);
  }

  async unsafeRedirect(url: string) {
    return this.res.redirect(url);
  }
}
