import xs, { Stream } from 'xstream';
import {VNode, DOMSource} from '@cycle/dom';
import {HTTPSource} from '@cycle/http';
import {div} from '@cycle/dom';
import update from 'react-addons-update';
import Sidebar from './components/sidebar';
import Dashboard from './components/dashboard';
import Drawer from './components/drawer';

import {
  Sources,
  Sinks,
  RequestBody,
  WebsocketData,
  Currency,
  AppSources,
  ComponentSources,
  AppSinks,
  Reducer,
  AppState
} from './interfaces';

export function App(sources: AppSources): AppSinks {
  const {socketIO}: AppSources = sources;

  const initState$ = xs.of<Reducer>(() => ({
    selected: 'BTC',
    currencies: {
      BTC: { price: 0, symb: 'BTC', days: [] },
      ETH: { price: 0, symb: 'ETH', days: [] },
      LTC: { price: 0, symb: 'LTC', days: [] }
    }
  }));

  //const socketData$ = socketIO.get('m')
  //  .map((data: any) => (state: AppState) => state);

  const initialData$: Stream<RequestBody> = sources.onion.state$
    .map(({selected}) => selected)
    .take(1)
    .map(requestData);

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
   // socketIO: outgoingMsg$,
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
      return div('.view-wrapper', [
        div('.main-view', [DashboardEl, DrawerEl])
      ]);
    });
}

function requestData(symb: string): RequestBody {
  const now = new Date();
  const ts = Math.round(now.getTime() / 1000);

  return {
    url: `https://min-api.cryptocompare.com/data/histoday?fsym=${symb}&tsym=USD&toTs=${ts}&e=CCCAGG`,
    method: 'GET',
    category: 'histoday'
  };
}
