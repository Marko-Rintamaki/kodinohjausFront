declare module 'react-apexcharts' {
  import { Component } from 'react';
  interface Props {
    type: string;
    series: any[];
    options: any;
    height?: number|string;
    width?: number|string;
  }
  export default class ReactApexChart extends Component<Props> {}
}
