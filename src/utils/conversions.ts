'use strict';

import numeral from 'numeral';

export function toDollar(amt: number = 0): string {
  return numeral(amt).format('$0,0.00');
}

export function decimalToPCT(dec: number = 0): string {
  return numeral(dec).format('0.00%');
}
