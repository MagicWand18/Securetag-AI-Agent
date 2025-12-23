import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ProxyService {
  async makeRequest(targetUrl: string) {
    // Sink: axios.get (SSRF)
    return axios.get(targetUrl);
  }
}
