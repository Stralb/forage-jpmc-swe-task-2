import React, { Component } from 'react';
import { Table } from '@finos/perspective';
import { ServerRespond } from './DataStreamer';
import './Graph.css';

/**
 * Props declaration for <Graph />
 */
interface IProps {
  data: ServerRespond[],
}

/**
 * Perspective library adds load to HTMLElement prototype.
 * This interface acts as a wrapper for Typescript compiler.
 */
interface PerspectiveViewerElement extends HTMLElement{
  load: (table: Table) => void,
}

/**
 * React component that renders Perspective based on data
 * parsed from its parent through data property.
 */
class Graph extends Component<IProps, {}> {
  // Perspective table
  table: Table | undefined;

  render() {
    return React.createElement('perspective-viewer');
  }

  componentDidMount() {
    // Get element to attach the table from the DOM.
    const elem = document.getElementsByTagName('perspective-viewer')[0] as unknown as PerspectiveViewerElement;

    const schema = {
      stock: 'string',
      top_ask_price: 'float',
      top_bid_price: 'float',
      timestamp: 'date',
    };

    if (window.perspective && window.perspective.worker()) {
      this.table = window.perspective.worker().table(schema);
    }
    if (this.table) {
      // Load the table in the <perspective-viewer> DOM reference.

      // Add more Perspective configurations here.
      elem.load(this.table);

      elem.setAttribute('view', 'y_line');
      elem.setAttribute('column-pivots', '["Stock"]');
      elem.setAttribute('row-pivots', '["timestamp"]');
      elem.setAttribute('columns', '["top_ask_price"]');
      elem.setAttribute('aggregates', JSON.stringify({"stock":"distinct count",
              "top_ask_price":"avg",
              "top_bid_price":"avg",
              "timestamp":"distinct count"}));


    }
  }

  componentDidUpdate() {
  if (this.table) {
    // Aggregate data to avoid duplicates
    const aggregatedData: Record<string, { top_ask_price: number, top_bid_price: number, timestamp: Date }> = {};

    this.props.data.forEach((el: any) => {
      // Convert timestamp to Date if it's not already a Date object
      const timestamp = typeof el.timestamp === 'string' ? new Date(el.timestamp) : el.timestamp;

      // Use the ISO string of the timestamp for the key
      const key = `${el.stock}-${timestamp.toISOString()}`;

      if (!aggregatedData[key]) {
        aggregatedData[key] = {
          top_ask_price: el.top_ask ? el.top_ask.price : 0,
          top_bid_price: el.top_bid ? el.top_bid.price : 0,
          timestamp: timestamp,
        };
      } else {
        aggregatedData[key].top_ask_price = (aggregatedData[key].top_ask_price + (el.top_ask ? el.top_ask.price : 0)) / 2;
        aggregatedData[key].top_bid_price = (aggregatedData[key].top_bid_price + (el.top_bid ? el.top_bid.price : 0)) / 2;
      }
    });

    // Convert aggregated data to an array of records
    const formattedData: Record<string, (string | number | boolean | Date)[]> = {
      stock: [],
      top_ask_price: [],
      top_bid_price: [],
      timestamp: []
    };

    Object.keys(aggregatedData).forEach(key => {
      formattedData.stock.push(key.split('-')[0]);
      formattedData.top_ask_price.push(aggregatedData[key].top_ask_price);
      formattedData.top_bid_price.push(aggregatedData[key].top_bid_price);
      formattedData.timestamp.push(aggregatedData[key].timestamp);
    });

    // Update table with formatted data
    this.table.update(formattedData);
  }
}

}

export default Graph;