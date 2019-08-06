const Encoder = require('./encoder.js');

const TYPE = Encoder.TYPE;

function proceedCommandFrame (frame, client) {
  if (frame.type === TYPE.CLOSE) {
    const status = frame.data.slice(0, 2);
    client.close(status);

    return true;
  }

  if (frame.type === TYPE.PING) {
    const data = Encoder.encode(frame.data, TYPE.PONG);
    client.socket.write(data);

    return true;
  }

  return false;
}

module.exports = proceedCommandFrame;
