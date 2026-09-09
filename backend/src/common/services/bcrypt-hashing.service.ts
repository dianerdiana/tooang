import { Injectable } from '@nestjs/common';

import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptHashingService {
  private readonly saltRound = 10;

  hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.saltRound);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
