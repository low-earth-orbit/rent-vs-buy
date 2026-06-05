import { recommendGlidePath } from "../utils/glide-path/engine";
import type { GlidePathRequest } from "../utils/glide-path/types";

// `self` is the DedicatedWorkerGlobalScope inside a Web Worker. The coordinate-ascent
// optimization is a few seconds of CPU, so it runs here off the main thread.
const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<GlidePathRequest>) => {
  const { input, requestId } = event.data;
  const result = recommendGlidePath(input);
  ctx.postMessage({ requestId, input, result });
};
