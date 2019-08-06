const Encoder = require('./encoder.js');

function Client (socket, header) {
  this.active = true;
  this.socket = socket;
  this.header = header;
}
Client.prototype.send = function (data) {
  if (this.active) {
    const encodedData = Encoder.encode(data);
    this.socket.write(encodedData);
  }
};
Client.prototype.close = function () {
  this.socket.end();
  this.active = false;
};

module.exports = Client;
