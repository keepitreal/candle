'use strict';

import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {scaleTime, scaleLinear} from 'd3-scale';
import {svg, h, h3, div, g} from '@cycle/dom';
import {createAxisGenerator} from 'd3-axis-hyperscript';
import {ComponentSources} from '../app';

const axisGenerator: any = createAxisGenerator(h);

export default function Dashboard(sources: ComponentSources) {
  const {props$, DOM} = sources;

  const graphBB$ = DOM.select('.dashboard-graph').elements()
    .compose(dropRepeats((a, b) => b.length === a.length))
    .map((svgEl) => {
      return svgEl.length && svgEl[0].getBoundingClientRect();
    });

  const state$ = xs.combine(props$, graphBB$)
    .map(([{selected, currencies}, graphBB]: [any]) => {
      const {days} = currencies[selected];
      const {height = 0, width = 0} = graphBB;

      const {open: highestOpen, close: highestClose} = days
        .sort((a, b) => a.high > b.high)
        .pop() || {};

      const earliestDay = days.pop() || new Date();

      const scaleY = scaleTime()
        .domain([0, highestOpen])
        .range([0, height]);

      const scaleX = scaleLinear()
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
          h('g', { style: {transform: 'translateY(635px)'}}, [xAxis])
        ])
      ]);
    });

  const sinks = {
    DOM: vdom$,
  };

  return sinks;
}

