import xs, { Stream } from 'xstream';
import { VNode, DOMSource } from '@cycle/dom';
import { HTTPSource } from '@cycle/http';
import { StateSource } from 'cycle-onionify';

import { Sources, Sinks, RequestBody } from './interfaces';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Drawer from './components/Drawer';

export type AppSources = Sources & { onion: StateSource<AppState>; };
export type ComponentSources = { DOM: DOMSource; props$: any };
export type AppSinks = Sinks & { onion: Stream<Reducer> };
export type Reducer = (prev: AppState) => AppState;
export type AppState = {
  price: number;
  selectedCurrency: string;
  currencies: Array<string>;
};

export function App(sources: AppSources): AppSinks {
  const {selectCurrency$, action$} = intent(sources.DOM);
  const vdom$: Stream<VNode> = view(sources);

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
    .map(requestPrice);

  const initRequest$: Stream<RequestBody> = sources.onion.state$
    .map(({selectedCurrency}) => selectedCurrency)
    .take(1)
    .map(requestPrice);

  return {
    DOM: vdom$,
    HTTP: xs.merge(changeCurrency$, initRequest$),
    onion: xs.merge(action$, initState$, updatePrice$)
  };
}

function intent(DOM: DOMSource) {
  const selectCurrency$: Stream<string> = DOM.select('.select-currency')
    .events('change')
    .map<string>((ev: any) => {
      return ev.target.options[ev.target.selectedIndex].value;
    });

  const action$ = selectCurrency$.map(
    selectedCurrency => (state: AppState): AppState => ({ ...state, selectedCurrency })
  );

  return {
    action$,
    selectCurrency$
  };
}

function view(sources: AppSources): Stream<VNode> {
  const {onion, DOM} = sources;
  const {state$} = onion;
  const sidebar = Sidebar({ DOM, props$: state$});
  const dashboard = Dashboard({ DOM, props$: state$ });
  const drawer = Drawer({ DOM, props$: state$ });

  return xs.combine(state$, sidebar.DOM, dashboard.DOM, drawer.DOM)
    .map(([{ price, currencies }, SidebarEl, DashboardEl, DrawerEl]) => {
      return <div className="view-wrapper">
        { SidebarEl }
        <div className="main-view">
          { DashboardEl }
          { DrawerEl }
        </div>
      </div>
    });
}

/*
 <select className='select-currency'>
        {currencies.map(currency => <option value={currency}>{currency}</option>)}
      </select>
      <span>{'Price: ' + price}</span>
*/

function requestPrice(symbol: string) {
  return {
    url: `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=BTC,USD,EUR`,
    method: 'GET',
    category: 'btcprice'
  };
}
