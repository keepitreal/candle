'use strict';

import { ComponentSources, AppSinks } from '../interfaces';

export default function Sidebar(sources: ComponentSources): AppSinks {
  const domSource = sources.DOM;
  const props$ = sources.props$;

  const state$ = props$.map((props: any) => {
    return props;
  });

  const vdom$ = state$.map((state: any) => {
    return <div className="sidebar">Sidebar</div>;
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}
