import { Stream } from 'xstream';
import { VNode, DOMSource } from '@cycle/dom';
import { HTTPSource, RequestOptions } from '@cycle/http';
import { StateSource } from 'cycle-onionify';
import { TimeSource } from '@cycle/time';

export type Sources = {
  DOM: DOMSource;
  HTTP: HTTPSource;
  Time: TimeSource;
  websocket: Stream<WebsocketData>;
};

export type RootSinks = {
  DOM: Stream<VNode>;
  HTTP: Stream<RequestOptions>;
};

export type Sinks = Partial<RootSinks>;
export type Component = (s: Sources) => Sinks;

export type RequestBody = {
  url: string;
  method: string;
  category: string;
};

export interface WebsocketData {
  data: string;
}

export interface Currency {
  price: number;
  symb: string;
  days: Array<any>;
}

export interface BoundingBox {
  height: number;
  width: number;
}

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


