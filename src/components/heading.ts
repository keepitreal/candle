'use strict';

import xs from 'xstream';
import {div, span} from '@cycle/dom';
import {ComponentSources, AppSinks} from '../interfaces';

export default function Heading(sources: ComponentSources): AppSinks {
  const dom$ = xs.of(
    div('.tabs', [
      div('.tab', [
        div('.heading-title', 'Bitcoin (BTC)'), 
        div('.heading-prices', [
          span('.heading-price', '$5,432.10'),
          span('.heading-change', '+144.12 (4.65%)')
        ])
      ])
    ])
  );

  const sinks = {
    DOM: dom$
  };

  return sinks;
}
