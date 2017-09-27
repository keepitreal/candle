import xs, {Stream} from 'xstream';
import {WebsocketData} from '../interfaces';

export function makeWebsocketDriver(url: string): () => Stream<WebsocketData> {
  const websocket: WebSocket = new WebSocket(url);

  return () => {
    return xs.create({
      start: listener => {
        websocket.onmessage = (msg: MessageEvent) => listener.next(msg);
      },
      stop: () => {}
    }).map((msg: any) => JSON.parse(msg.data));
  }
}

