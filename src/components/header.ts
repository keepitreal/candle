'use strict';

import xs from 'xstream';
import {div, span, select, option} from '@cycle/dom';
import {ComponentSources, AppSinks} from '../interfaces';

export default function Header(sources: ComponentSources): AppSinks {
  const props$ = sources.props$;

  const options$ = props$.map(({chartTypes}) => chartTypes);

  const vdom$ = xs.combine(options$).map(([options]) => {
    console.log(options);
    return div('.header', [
      span('.header-title', 'Chart Settings'),
      select('.select', options.map(o => option(o)))
    ]);
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}
