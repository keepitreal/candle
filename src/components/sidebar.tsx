'use strict';

import { Sources, Sinks, RequestBody } from '../interfaces';
import { ComponentSources, AppSinks } from '../app';

export default function Sidebar(sources: ComponentSources) {
  const domSource = sources.DOM;
  const props$ = sources.props$;

  const state$ = props$.map((props: any) => {
    return props;
  });

  const vdom$ = state$.map((state: any) => {
    return <div className="sidebar">Sidebar</div>
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}

