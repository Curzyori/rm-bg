import { installPageProcessRuntime } from './pageProcessRuntime.js';

installPageProcessRuntime({
  targetWindow: window,
  logger: console
});
