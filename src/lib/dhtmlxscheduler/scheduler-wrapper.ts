// Wrapper to properly import and export the DHTMLX Scheduler library
// The local dhtmlxscheduler.js file uses UMD format which needs to be handled differently

// Load the script and access it from window
import './dhtmlxscheduler.js';

// The library exposes itself as window.scheduler
declare global {
  interface Window {
    scheduler: any;
    Scheduler: any;
  }
}

export const scheduler = window.scheduler;
export const Scheduler = window.Scheduler;
export default scheduler;
