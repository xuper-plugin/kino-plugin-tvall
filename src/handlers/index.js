import generic from "./generic.js";
import daddylive from "./daddylive.js";

const HANDLERS = { generic, daddylive };

/** The handler for a host's `type`, or null when no handler is registered for it. */
export function handlerFor(host) {
  return (host && HANDLERS[host.type]) || null;
}

export { HANDLERS };
