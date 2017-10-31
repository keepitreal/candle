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
import Heading from './components/heading';
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
    coinlist: {},
    symbols: [],
    searchTerm: '',
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

  const fetchSnapshots$: Stream<RequestBody> = state$
    .map(({selected}) => selected)
    .take(1)
    .map(requestSnapshot);

  const fetchCoinList$: Stream<RequestBody> = xs.of(requestCoinList());

  const outgoingMsg$ = xs.of({
    messageType: 'SubAdd',
    message: {subs: ['2~CCCAGG~BTC~USD']}
  });

  const snapshots$: Stream<Reducer> = sources.HTTP.select('snapshot')
    .flatten()
    .map(({body: {RAW}}) => RAW)
    .map((symbs) => {
      const pairs = Object.keys(symbs).reduce((prev, key) => {
        return prev.concat([[key, symbs[key]]);
      }, []);
      return xs.of(...pairs);
    })
    .flatten()
    .map((([symb, snapshot]) => state => {
      return update(state, {currencies: {[symb]: {snapshot: {$set: snapshot}}}});
    }));

  const coinlist$: Stream<Reducer> = sources.HTTP.select('coinlist')
    .flatten()
    .map((res) => res.body.Data)
    .map((coins) => state => update(state, {
      coinlist: {$set: coins},
      symbols: {$set: Object.keys(coins)}
    }));

  const {vdom$, vstate$, vhttp$} = view(sources);

  return {
    DOM: vdom$,
    HTTP: xs.merge(fetchCoinList$, fetchSnapshots$, vhttp$),
   // socketIO: outgoingMsg$,
    onion: xs.merge(initState$, coinlist$, snapshots$, vstate$)
  };
}

function view(sources: AppSources): Stream<VNode> {
  const {onion, DOM, HTTP} = sources;
  const {state$} = onion;
  const graph = Graph({DOM, props$: state$});
  const header = Header({DOM, HTTP, props$: state$});
  const heading = Heading({DOM, state$});

  const vdom$ = xs.combine(state$, graph.DOM, header.DOM, heading.DOM)
    .map(([state, GraphEl, HeaderEl, HeadingEl]) => {
      return div('.view-wrapper', [
        HeaderEl,
        div('.main-view', [HeadingEl, GraphEl])
      ]);
    });

  const vstate$ = xs.merge(header.onion);
  const vhttp$ = xs.merge(header.HTTP);

  return {vdom$, vstate$, vhttp$};
}
