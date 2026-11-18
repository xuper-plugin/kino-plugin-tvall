// daddylive: the thedaddy/daddylive family handler. Real logic in Task 5.
export default {
  async listChannels(_host, _ctx) { return []; },
  async listEvents(_host, _ctx) { return []; },
  async resolve(_host, _id, _ctx) { return null; },
  async health(_host, _ctx) { return { ok: false }; },
};
