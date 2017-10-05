'use strict';

import {div} from '@cycle/dom';
import {ComponentSources, AppSinks} from '../interfaces';

export default function Sidebar(sources: ComponentSources): AppSinks {
  const domSource = sources.DOM;
  const props$ = sources.props$;

  const state$ = props$.map((props: any) => {
    return props;
  });

  const vdom$ = state$.map((state: any) => {
    return div('.sidebar', '');
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}
