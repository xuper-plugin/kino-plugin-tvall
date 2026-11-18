// The handler contract. Every host type (generic, daddylive, livetv…) provides one of these.
// A Channel is { id, title, logo?, categoryId?, number? }. An Event is a Channel plus { start, title }.
// A Stream is { url, mime, headers } (headers carry the Referer/UA the signal needs).
//
// /** @typedef {{ listChannels(host, ctx): Promise<Channel[]>,
//  *             listEvents(host, ctx): Promise<Event[]>,
//  *             resolve(host, id, ctx): Promise<Stream|null>,
//  *             health(host, ctx): Promise<{ok:boolean, channels?:number}> }} Handler */
export default {};
