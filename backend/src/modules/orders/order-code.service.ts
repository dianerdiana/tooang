import { Injectable } from '@nestjs/common';

import { generateOrderCode, generateVerificationToken } from './checkout-identity';

@Injectable()
export class OrderCodeService {
  orderCode(now: Date) {
    return generateOrderCode(now);
  }

  verificationToken() {
    return generateVerificationToken();
  }
}
