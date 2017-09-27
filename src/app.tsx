import xs, { Stream } from 'xstream';
import { VNode, DOMSource } from '@cycle/dom';
import { HTTPSource } from '@cycle/http';
import { StateSource } from 'cycle-onionify';
import update from 'react-addons-update';

import { Sources, Sinks, RequestBody, WebsocketData, Currency } from './interfaces';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Drawer from './components/Drawer';

export type AppSources = Sources & { onion: StateSource<AppState>; socketIO: any };
export type ComponentSources = { DOM: DOMSource; props$: any, socketIO?: Stream<WebsocketData> };
export type AppSinks = Sinks & { onion: Stream<Reducer>; socketIO: any };
export type Reducer = (prev: AppState) => AppState;
export type AppState = {
  price: number;
  selectedCurrency: string;
  currencies: Array<string>;
};

export function App(sources: AppSources): AppSinks {
  const {selectCurrency$, action$} = intent(sources.DOM);
  const {socketIO}: AppSources = sources;

  const initState$ = xs.of<Reducer>(() => ({
    selected: 'BTC',
    currencies: {
      BTC: { price: 0, symb: 'BTC' },
      ETH: { price: 0, symb: 'ETH' },
      LTC: { price: 0, symb: 'LTC' },
    }
  }));

  const socketData$ = socketIO.get('m')
    .map((data: any) => (state: AppState) => state);

  const initialData$: Stream<RequestBody> = sources.onion.state$
    .map(({selected}) => selected)
    .take(1)
    .map(requestPrice);

  const outgoingMsg$ = xs.of({
    messageType: 'SubAdd',
    message: {subs: ['2~CCCAGG~BTC~USD']}
  });

  const updatePrice$: Stream<Reducer> = sources.HTTP.select('price')
    .flatten()
    .map((res: any) => res.body)
    .map<Reducer>((price: any) => (state: AppState) => {
      return update(state, {currencies: {[state.selected]: {price: {$set: price.USD}}}});
    });

  const changeCurrency$: Stream<RequestBody> = selectCurrency$
    .map(requestPrice);

  const vdom$: Stream<VNode> = view(sources);

  return {
    DOM: vdom$,
    HTTP: xs.merge(changeCurrency$, initialData$),
    socketIO: outgoingMsg$,
    onion: xs.merge(action$, initState$, updatePrice$, socketData$)
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

function requestPrice(symb) {
  return {
    url: `https://min-api.cryptocompare.com/data/price?fsym=${symb}&tsyms=USD,EUR`,
    method: 'GET',
    category: 'price'
  };
}
