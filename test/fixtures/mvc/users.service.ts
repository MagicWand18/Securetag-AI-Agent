
import { Injectable } from '@nestjs/common';
import * as child_process from 'child_process';

@Injectable()
export class UserService {
  constructor(private db: any) {}

  create(data: any) {
    // Sink: SQLi
    this.db.query(`INSERT INTO users VALUES (${data.name})`);
    
    // Sink: CMDi
    child_process.exec(`echo ${data.name}`);
  }

  delete(id: string) {
      // Sink: SQLi
      this.db.execute("DELETE FROM users WHERE id = " + id);
  }
}
