'use strict';

import xs from 'xstream';
import {scaleTime, scaleLinear} from 'd3-scale';
import {svg, h, h3, div, g} from '@cycle/dom';
import {createAxisGenerator} from 'd3-axis-hyperscript';
import { ComponentSources } from '../app';

const axisGenerator: any = createAxisGenerator(h);

export default function Dashboard(sources: ComponentSources) {
  const {props$} = sources;

  const state$ = props$.map(({selected, currencies}: any) => {
    const {days} = currencies[selected];

    const {open: highestOpen, close: highestClose} = days
      .sort((a, b) => a.high > b.high)
      .pop() || {};

    const earliestDay = days.pop() || new Date();

    const scaleY = scaleTime()
      .domain([0, highestOpen])
      .range([0, 645]);

    const scaleX = scaleLinear()
      .domain([new Date(earliestDay.time), new Date()])
      .range([0, 1048]);

    return {scaleX, scaleY, days};
  });

  const xAxis$ = state$.map(
    ({scaleX, days}) => axisGenerator(scaleX, 'Horizontal', 20, 10)
      .ticks(days.length)
  );

  const yAxis$ = state$.map(
    ({scaleY}) => axisGenerator
      .axisLeft(scaleY)
      .ticks(10)
  );

  const vdom$ = xs.combine(state$, xAxis$, yAxis$)
    .map(([state, xAxis, yAxis]: [any, any, any]) => {
      return div('.dashboard', [
        svg('.dashboard-graph', {
          attrs: { viewBox: '0 0 1048 645', preserveAspectRatio: 'xMinYMin slice' }
        }, [
          yAxis,
          h('g', { style: {transform: 'translateY(635px)'}}, [xAxis])
        ])
      ]);
    });

  const sinks = {
    DOM: vdom$,
  };

  return sinks;
}

function hoursAgo(count: number): Date {
  return new Date(
    new Date().getTime() - 1000 * 60 * 60 * count
  );
}
