'use strict';

import xs from 'xstream';
import {div, span, select, option} from '@cycle/dom';
import {ComponentSources, AppSinks} from '../interfaces';

export default function Header(sources: ComponentSources): AppSinks {
  const props$ = sources.props$;

  const vdom$ = props$.map(({chartTypes, comparisons}) => {
    return div('.header', [
      span('.header-title', 'Chart Settings')
//       select('.select', chartTypes.map(type => option(type))),
//       span('.header-text', 'in'),
//       select('.select', comparisons.map(symb => option(symb)))
    ]);
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}
