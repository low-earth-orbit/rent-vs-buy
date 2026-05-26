/* eslint-env worker */
// Disable `no-restricted-globals` for `self` — in a Web Worker, `self` is the
// WorkerGlobalScope and is the standard, idiomatic reference. The rule exists
// to prevent confusion in window contexts, which doesn't apply here.
/* eslint-disable no-restricted-globals */
import { runMonteCarlo } from "../utils/monteCarlo";

self.onmessage = (event) => {
  const { userInput, numSimulations, requestId } = event.data;
  const result = runMonteCarlo(userInput, numSimulations);
  self.postMessage({ requestId, result });
};
