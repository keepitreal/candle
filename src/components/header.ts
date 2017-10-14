'use strict';

import xs from 'xstream';
import {div, input} from '@cycle/dom';
import {ComponentSources, AppSinks} from '../interfaces';

export default function Header(sources: ComponentSources): AppSinks {
  const props$ = sources.props$;

  const vdom$ = props$.map(({chartTypes, comparisons}) => {
    return div('.header', [
      div('.header-title', 'Candle'),
      input('.instrument-search', {})
    ]);
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}
