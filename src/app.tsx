import xs, { Stream } from 'xstream';
import { VNode, DOMSource } from '@cycle/dom';
import { HTTPSource } from '@cycle/http';
import { StateSource } from 'cycle-onionify';

import { Sources, Sinks, RequestBody } from './interfaces';

export type AppSources = Sources & { onion: StateSource<AppState> };
export type AppSinks = Sinks & { onion: Stream<Reducer> };
export type Reducer = (prev: AppState) => AppState;
export type AppState = {
  price: number;
  selectedCurrency: string;
  currencies: Array<string>;
};

export function App(sources: AppSources): AppSinks {
  const {selectCurrency$, action$} = intent(sources.DOM);
  const vdom$: Stream<VNode> = view(sources.onion.state$);

  const initState$ = xs.of<Reducer>(() => ({
    price: 0,
    selectedCurrency: 'BTC',
    currencies: ['BTC', 'ETH', 'LTC']
  }));

  const updatePrice$: Stream<Reducer> = sources.HTTP.select('btcprice')
    .flatten()
    .map((res: any) => res.body)
    .map<Reducer>((price: any) => {
      return (state: AppState) => ({ ...state, price: price.BTC });
    });

  const changeCurrency$: Stream<RequestBody> = selectCurrency$
    .startWith('BTC')
    .map((currency) => ({
      url: `https://min-api.cryptocompare.com/data/price?fsym=${currency}&tsyms=BTC,USD,EUR`,
      method: 'GET',
      category: 'btcprice'
    }));

  return {
    DOM: vdom$,
    HTTP: changeCurrency$,
    onion: xs.merge(action$, initState$, updatePrice$)
  };
}

function intent(DOM: DOMSource) {
  const selectCurrency$: Stream<Event> = DOM.select('.select-currency')
    .events('change')
    .map<Reducer>((ev: any) => {
      return ev.target.options[ev.target.selectedIndex].value;
    })

  const action$ = selectCurrency$.map(
    selectedCurrency => (state: AppState) => ({ ...state, selectedCurrency })
  );

  return {
    action$,
    selectCurrency$
  };
}

function view(state$: Stream<AppState>): Stream<VNode> {
  return state$.map(({ price, currencies }) =>
    <div>
      <select className='select-currency'>
        {currencies.map(currency => <option value={currency}>{currency}</option>)}
      </select>
      <span>{'Price: ' + price}</span>
    </div>
  );
}

