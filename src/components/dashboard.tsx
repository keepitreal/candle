'use strict';

import xs, {Stream} from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {scaleTime, scaleLinear} from 'd3-scale';
import {svg, h, h3, div} from '@cycle/dom';
import {createAxisGenerator} from 'd3-axis-hyperscript';
import {ComponentSources} from '../app';
import {BoundingBox} from '../interfaces';

declare type ElementList = NodeListOf<HTMLElement>;

const axisGenerator: any = createAxisGenerator(h);

export default function Dashboard(sources: ComponentSources) {
  const {props$, DOM} = sources;

  const graphBB$ = DOM.select('.dashboard-graph').elements()
    .compose(
      dropRepeats((a: ElementList, b: ElementList) => b.length === a.length)
    )
    .map((svgEl: ElementList) =>
      svgEl.length && svgEl[0].getBoundingClientRect()
    );

  const state$ = xs.combine(props$, graphBB$)
    .map(([{selected, currencies}, graphBB]: [any, any]) => {
      const {days} = currencies[selected];
      const {height = 0, width = 0} = graphBB;

      const {open: highestOpen = 0, close: highestClose = 0} = days
        .sort((a, b) => a.high > b.high)
        .pop() || {};

      const earliestDay = days.pop() || new Date();

      const scaleY = scaleLinear()
        .domain([0, highestOpen])
        .range([height, 0]);

      const scaleX = scaleTime()
        .domain([new Date(earliestDay.time), new Date()])
        .range([0, width]);

      return {scaleX, scaleY, days, height, width};
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
      const {height, width} = state;
      return div('.dashboard', [
        svg('.dashboard-graph', {
          attrs: { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'xMinYMin slice' }
        }, [
          yAxis,
          h('g', { style: {transform: `translateY(${height - 10}px)`}}, [xAxis])
        ])
      ]);
    });

  const sinks = {
    DOM: vdom$,
  };

  return sinks;
}

