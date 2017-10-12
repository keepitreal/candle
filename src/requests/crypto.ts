'use strict';

export function requestHistorical(symb: string): RequestBody {
  const now = new Date();
  const ts = Math.round(now.getTime() / 1000);

  return {
    url: `https://min-api.cryptocompare.com/data/histoday?fsym=${symb}&tsym=USD&toTs=${ts}&e=CCCAGG`,
    method: 'GET',
    category: 'historical'
  };
}

export function requestCoinList(): RequestBody {
  return {
    url: 'https://min-api.cryptocompare.com/api/data/coinlist/',
    method: 'GET',
    category: 'coinlist'
  };
}

export function requestSnapshot(...symbs: string): RequestBody {
  return {
    url: `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbs}&tsyms=USD`,
    method: 'GET',
    category: 'snapshot'
  };
}
