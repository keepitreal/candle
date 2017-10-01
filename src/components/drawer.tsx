'use strict';

import {ComponentSources, AppSinks} from '../interfaces';

export default function Drawer(sources: ComponentSources): AppSinks {
  const props$ = sources.props$;

  const state$ = props$.map((props: any) => {
    return props;
  });

  const vdom$ = state$.map(({currencies}) => {
    return <div className="drawer">
      <ul className="securities">
        <li className="legend">
          <span className="column-4">Symbol</span>
          <span className="column-4">Name</span>
          <span className="column-4">Price</span>
          <span className="column-4">Trading Volume</span>
        </li>
        {Object.keys(currencies).map((symb: string) => {
          const currency = currencies[symb];
          return <li>{`${currency.symb} ${currency.price}`}</li>;
        })}
      </ul>
    </div>;
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}
