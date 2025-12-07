module.exports.socketWrite = function socketWrite (socket, message) {
  if (socket.writable) {
    socket.write(message);
  }
};

module.exports.socketEnd = function socketEnd (socket, message) {
  if (socket.writable) {
    socket.end(message);
  }
};

function generateBytes (length) {
  const data = new Array(length);

  for (let index = 0 ; index < length ; ++index) {
    data[index] = ~~(Math.random() * 256);
  }

  return Buffer.from(data);
}

module.exports.generateClientKey = function (length = 16) {
 return generateBytes(length).toString('base64');
};

module.exports.generateMask = function () {
  return generateBytes(4);
};

const KEY_RE = /\$\{(\w+)\}/g;

module.exports.useTemplate = function (template, substitutions) {
  return template.replace(KEY_RE, function (source, key) {
    return key in substitutions ? substitutions[key] : source;
  });
};

module.exports.applyMask = function (data, mask) {
  const maskLength = mask.length;
  const result = Buffer.alloc(data.length);

  for (let index = 0 ; index < data.length ; index++) {
    result[index] = data[index] ^ mask[index % maskLength];
  }

  return result;
};
