'use strict';

import {div, span, li, ul} from '@cycle/dom';
import {ComponentSources, AppSinks} from '../interfaces';

export default function Drawer(sources: ComponentSources): AppSinks {
  const props$ = sources.props$;

  const state$ = props$.map((props: any) => {
    return props;
  });

  const vdom$ = state$.map(({currencies}) => {
    return div('.drawer', [
      ul('.securities', [
        li('.legend', [
          span('.column-4', 'Symbol'),
          span('.column-4', 'Name'),
          span('.column-4', 'Price'),
          span('.column-4', 'Trading Volume')
        ]),
        ...Object.keys(currencies).map((symb: string) => {
          const currency = currencies[symb];
          return li('', `${currency.symb} ${currency.price}`);
        })
      ])
    ]);
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}
