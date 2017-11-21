'use strict';

import numeral from 'numeral';

export function toDollar(amt: number = 0, format: string = '$0,0.00'): string {
  return numeral(amt).format(format);
}

export function toDollarThousands(amt: number = 0): string {
  const format = amt > 100 ? '0,0' : '0,0.00';
  return numeral(amt).format(format);
}

export function decimalToPCT(dec: number = 0): string {
  return numeral(dec).format('0.00%');
}
