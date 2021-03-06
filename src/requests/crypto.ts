'use strict';

export function requestHistorical(symb: string, period: string): RequestBody {
  const now = new Date();
  const ts = Math.round(now.getTime() / 1000);

  return {
    //url: `https://min-api.cryptocompare.com/data/histoday?fsym=${symb}&tsym=USD&toTs=${ts}&e=CCCAGG&aggregate=2&limit=2000`,
    url: `./offline/histo${period}.json`,
    method: 'GET',
    category: 'historical'
  };
}

export function requestCoinList(): RequestBody {
  return {
    //url: 'https://www.cryptocompare.com/api/data/coinlist/',
    url: './offline/coinlist.json',
    method: 'GET',
    category: 'coinlist',
    withCredentials: true
  };
}

export function requestSnapshot(...symbs: string): RequestBody {
  return {
    url: `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbs}&tsyms=USD`,
    method: 'GET',
    category: 'snapshot'
  };
}
