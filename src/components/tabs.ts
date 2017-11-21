'use strict';

import xs from 'xstream';
import {div, span} from '@cycle/dom';
import {ComponentSources, AppSinks} from '../interfaces';
import {toDollar, decimalToPCT} from '../utils/conversions';

export default function Tabs(sources: ComponentSources): AppSinks {
  const {state$} = sources;

  const props$ = state$.map(({selected, currencies}) => {
    const currency = currencies[selected];
    const snapshot = currency.snapshot.USD;
    const positive = snapshot && snapshot.CHANGEDAY > 0;
    return {
      name: currency.fullname,
      symbol: currency.symb,
      price: snapshot && toDollar(snapshot.PRICE),
      change: snapshot && `${positive ? '+' : '-'} ${snapshot.CHANGEDAY.toFixed(2)}`,
      pctchange: snapshot && `${decimalToPCT(snapshot.CHANGEPCTDAY / 100)}`
    };
  });

  const dom$ = props$.map(({name, symbol, price, change, pctchange}) => {
    return div('.tabs', [
      div('.tab', [
        div('.heading-title', `${name} (${symbol})`),
        div('.heading-prices', [
          span('.heading-price', price),
          span('.heading-change', `${change} (${pctchange})`)
        ])
      ])
    ]);
  });

  const sinks = {
    DOM: dom$
  };

  return sinks;
}
