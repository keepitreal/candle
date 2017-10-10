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
          span('.column-3', 'Symbol'),
          span('.column-3', 'Last Price'),
          span('.column-3', '24hr High'),
          span('.column-3', '24hr Low'),
          span('.column-3', '24hr Change'),
          span('.column-3', '24hr Volume'),
          span('.column-3', 'Market Cap')
        ]),
        ...Object.keys(currencies).map((symb: string) => {
          const {snapshot: {USD}} = currencies[symb];

          return li('', [
            span('.column-3', USD && USD.FROMSYMBOL),
            span('.column-3', USD && USD.PRICE),
            span('.column-3', USD && USD.HIGH24HOUR),
            span('.column-3', USD && USD.LOW24HOUR),
            span('.column-3', USD && USD.CHANGE24HOUR.toFixed(2)),
            span('.column-3', USD && USD.VOLUME24HOUR.toFixed(2)),
            span('.column-3', USD && USD.MKTCAP.toFixed(2)),
          ]);
        })
      ])
    ]);
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}
