import xs, { Stream } from 'xstream';
import { VNode, DOMSource } from '@cycle/dom';
import { HTTPSource } from '@cycle/http';
import { StateSource } from 'cycle-onionify';
import update from 'react-addons-update';

import { Sources, Sinks, RequestBody, WebsocketData, Currency } from './interfaces';
import Sidebar from './components/sidebar';
import Dashboard from './components/dashboard';
import Drawer from './components/drawer';

export type AppSources = Sources & { onion: StateSource<AppState>; socketIO: any };
export type ComponentSources = {
  DOM: DOMSource;
  props$: any,
  socketIO?: Stream<WebsocketData>
};
export type AppSinks = Sinks & { onion: Stream<Reducer>; socketIO: any };
export type Reducer = (prev: AppState) => AppState;
export type AppState = {
  selected: string;
  currencies: any;
};

export function App(sources: AppSources): AppSinks {
  const {socketIO}: AppSources = sources;

  const initState$ = xs.of<Reducer>(() => ({
    selected: 'BTC',
    currencies: {
      BTC: { price: 0, symb: 'BTC', days: [] },
      ETH: { price: 0, symb: 'ETH', days: [] },
      LTC: { price: 0, symb: 'LTC', days: [] },
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

  const histoData$: Stream<Reducer> = sources.HTTP.select('histoday')
    .flatten()
    .map((res: any) => res.body.Data)
    .map<Reducer>((days: any) => (state: AppState) => {
      return update(state, {currencies: {[state.selected]: {days: {$set: days}}}});
    });

  const vdom$: Stream<VNode> = view(sources);

  return {
    DOM: vdom$,
    HTTP: xs.merge(initialData$),
    socketIO: outgoingMsg$,
    onion: xs.merge(initState$, histoData$)
  };
}

function view(sources: AppSources): Stream<VNode> {
  const {onion, DOM} = sources;
  const {state$} = onion;
  const sidebar = Sidebar({ DOM, props$: state$});
  const dashboard = Dashboard({ DOM, props$: state$ });
  const drawer = Drawer({ DOM, props$: state$ });

  return xs.combine(state$, sidebar.DOM, dashboard.DOM, drawer.DOM)
    .map(([state, SidebarEl, DashboardEl, DrawerEl]) => {
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
  const now = Date.now();
  const ts = new Date(now - (165 * 24 * 60 * 60 * 1000));

  return {
    url: `https://min-api.cryptocompare.com/data/histoday?fsym=${symb}&tsym=USD&toTs=${Math.round(ts.getTime() / 1000)}&e=CCCAGG`,
    method: 'GET',
    category: 'histoday'
  };
}
