import { runMonteCarlo } from "../utils/monteCarlo";

// eslint-disable-next-line no-restricted-globals
self.onmessage = (event) => {
  const { userInput, numSimulations, requestId } = event.data;
  const result = runMonteCarlo(userInput, numSimulations);
  // eslint-disable-next-line no-restricted-globals
  self.postMessage({ requestId, result });
};
