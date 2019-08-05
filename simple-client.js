function MadSocket (address, listeners) {
  var ws = new WebSocket(address);

  listeners || (listeners = {});
  listeners.open && (ws.onopen = listeners.open);
  listeners.close && (ws.onclose = listeners.close);
  listeners.message && (ws.onmessage = function (event) {
    listeners.message.call(this, event.data, event);
  });

  return ws;
}
