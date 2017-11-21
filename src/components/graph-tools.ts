'use strict';

import xs from 'xstream';
import {div, span} from '@cycle/dom';
import {ComponentSources, AppSinks} from '../interfaces';

export default function GraphTools(sources: ComponentSources): AppSinks {
  const dom$ = xs.of(div('.graph-tools', [
    span('.graph-tool', '1D'),
    span('.graph-tool', '1W'),
    span('.graph-tool', '1M'),
    span('.graph-tool', '6M'),
    span('.graph-tool', '1Y')
  ]));

  const sinks = {
    DOM: dom$
  };

  return sinks;
}
