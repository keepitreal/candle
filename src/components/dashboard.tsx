'use strict';

import { ComponentSources } from '../app';

export default function Dashboard(sources: ComponentSources) {
  const props$ = sources.props$;

  const state$ = props$.map((props: any) => {
    return props;
  });

  const vdom$ = state$.map((state: any) => {
    return <div className="dashboard">Dashboard</div>
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}

