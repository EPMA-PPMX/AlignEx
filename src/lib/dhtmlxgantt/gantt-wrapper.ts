// Wrapper to properly import and export the DHTMLX Gantt library
// The local dhtmlxgantt.js file uses UMD format which needs to be handled differently

// Load the script and access it from window
import './dhtmlxgantt.js';

// The library exposes itself as window.gantt
declare global {
  interface Window {
    gantt: any;
    Gantt: any;
  }
}

export const gantt = window.gantt;
export const Gantt = window.Gantt;
export default gantt;
