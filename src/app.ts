import url from 'url';
import querystring from 'querystring';
import xs, { Stream } from 'xstream';
import {VNode, DOMSource} from '@cycle/dom';
import {HTTPSource} from '@cycle/http';
import {div} from '@cycle/dom';
import update from 'react-addons-update';
import Sidebar from './components/sidebar';
import Graph from './components/graph';
import Drawer from './components/drawer';
import Header from './components/header';
import {requestHistorical, requestCoinList, requestSnapshot} from './requests/crypto';

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
    currencies: {
      BTC: { snapshot: {}, symb: 'BTC', days: [], fullname: 'Bitcoin' },
      ETH: { snapshot: {}, symb: 'ETH', days: [], fullname: 'Ethereum'},
      LTC: { snapshot: {} ,symb: 'LTC', days: [], fullname: 'Litecoin' },
      XRP: { snapshot: {}, symb: 'XRB', days: [], fullname: 'Ripple' },
      DOGE: { snapshot: {}, symb: 'DOGE', days: [], fullname: 'Dogecoin' }
    }
  }));

  //const socketData$ = socketIO.get('m')
  //  .map((data: any) => (state: AppState) => state);

  const fetchHistorical$: Stream<RequestBody> = state$
    .map(({selected}) => selected)
    .take(1)
    .map(requestHistorical);

  const fetchSnapshots$: Stream<RequestBody> = state$
    .map(({currencies}) => Object.keys(currencies))
    .take(1)
    .map(requestSnapshot);

  const fetchCoinList$: Stream<RequestBody> = xs.of(requestCoinList());

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
    .map(({body: {RAW}}) => RAW)
    .map((symbs) => {
      const pairs = Object.keys(symbs).reduce((prev, key) => {
        return prev.concat([[key, symbs[key],]);
      }, []);
      return xs.of(...pairs);
    })
    .flatten()
    .map((([symb, snapshot]) => state => {
      return update(state, {currencies: {[symb]: {snapshot: {$set: snapshot}}}});
    }));

  const coinList$: Stream<Reducer> = sources.HTTP.select('coinlist')
    .flatten()
    .map((res) => {
      console.log(res);
      return (state) => state;
    });

  const vdom$: Stream<VNode> = view(sources);

  return {
    DOM: vdom$,
    HTTP: xs.merge(fetchHistorical$, fetchCoinList$),
   // socketIO: outgoingMsg$,
    onion: xs.merge(initState$, historical$, snapshots$)
  };
}

function view(sources: AppSources): Stream<VNode> {
  const {onion, DOM} = sources;
  const {state$} = onion;
  const graph = Graph({ DOM, props$: state$ });
  const header = Header({ DOM, props$: state$ });

  return xs.combine(state$, graph.DOM, header.DOM)
    .map(([state, GraphEl, HeaderEl]) => {
      return div('.view-wrapper', [
        HeaderEl,
        div('.main-view', [GraphEl])
      ]);
    });
}
