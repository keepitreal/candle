'use strict';

import { ComponentSources } from '../app';

export default function Drawer(sources: ComponentSources) {
  const props$ = sources.props$;

  const state$ = props$.map((props: any) => {
    return props;
  });

  const vdom$ = state$.map(({currencies}: any) => {
    return <div className="drawer">
      <ul className="securities">
        <li className="legend">
          <span className="column-4">Symbol</span>
          <span className="column-4">Name</span>
          <span className="column-4">Price</span>
          <span className="column-4">Trading Volume</span>
        </li>
        {currencies.map(currency => <li>{currency}</li>)}
      </ul>
    </div>
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}
