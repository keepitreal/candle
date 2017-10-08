import xs, { Stream } from 'xstream';
import {VNode, DOMSource} from '@cycle/dom';
import {HTTPSource} from '@cycle/http';
import {div} from '@cycle/dom';
import update from 'react-addons-update';
import Sidebar from './components/sidebar';
import Dashboard from './components/dashboard';
import Drawer from './components/drawer';
import Header from './components/header';
import {requestHistorical, requestSnapshot} from './requests/crypto';

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
  const {onion: {state$}}: AppSources = sources;

  const initState$ = xs.of<Reducer>(() => ({
    selected: 'BTC',
    chartTypes: ['Price', 'Hash Rate', 'Volatility'],
    comparisons: ['BTC', 'USD', 'LTC', 'GBP', 'EUR'],
    currencies: {
      BTC: { price: 0, symb: 'BTC', days: [], fullname: 'Bitcoin' },
      ETH: { price: 0, symb: 'ETH', days: [], fullname: 'Ethereum'},
      LTC: { price: 0, symb: 'LTC', days: [], fullname: 'Litecoin' },
      XRP: { price: 0, symb: 'XRB', days: [], fullname: 'Ripple' },
      DOGE: { price: 0, symb: 'DOGE', days: [], fullname: 'Dogecoin' }
    }
  }));

  //const socketData$ = socketIO.get('m')
  //  .map((data: any) => (state: AppState) => state);

  const fetchHistorical$: Stream<RequestBody> = state$
    .map(({selected}) => selected)
    .take(1)
    .map(requestHistorical)
    .debug(v => console.log(v));

  const fetchSnapshots$: Stream<RequestBody> = state$
    .map(({currencies}) => {
      return Object.keys(currencies).map(key => requestSnapshot(key));
    })
    .map(pairs => xs.of(...pairs))
    .flatten()
    .debug(v => console.log(v));

  const outgoingMsg$ = xs.of({
    messageType: 'SubAdd',
    message: {subs: ['2~CCCAGG~BTC~USD']}
  });

  const historical$: Stream<Reducer> = sources.HTTP.select('historical')
    .flatten()
    .map((res: any) => res.body.Data)
    .map<Reducer>((days: any) => (state: AppState) => {
      return update(state, {currencies: {[state.selected]: {days: {$set: days}}}});
    });

  const snapshots$: Stream<Reducer> = sources.HTTP.select('snapshot')
    .flatten()
    .map((res) => res.body.Data)
    .map(<Reducer>(days => state => {
      return (state) => state;
    });

  const vdom$: Stream<VNode> = view(sources);

  return {
    DOM: vdom$,
    HTTP: xs.merge(fetchHistorical$, fetchSnapshots$),
   // socketIO: outgoingMsg$,
    onion: xs.merge(initState$, historical$, snapshots$)
  };
}

function view(sources: AppSources): Stream<VNode> {
  const {onion, DOM} = sources;
  const {state$} = onion;
  const sidebar = Sidebar({ DOM, props$: state$});
  const dashboard = Dashboard({ DOM, props$: state$ });
  const drawer = Drawer({ DOM, props$: state$ });
  const header = Header({ DOM, props$: state$ });

  return xs.combine(state$, sidebar.DOM, dashboard.DOM, drawer.DOM, header.DOM)
    .map(([state, SidebarEl, DashboardEl, DrawerEl, HeaderEl]) => {
      return div('.view-wrapper', [
        SidebarEl,
        div('.main-view', [HeaderEl, DashboardEl, DrawerEl])
      ]);
    });
}

