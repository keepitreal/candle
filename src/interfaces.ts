import { Stream } from 'xstream';
import { VNode, DOMSource } from '@cycle/dom';
import { HTTPSource, RequestOptions } from '@cycle/http';
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
