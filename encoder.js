const Reader = require('mbr-buffer').Reader;
const Writer = require('mbr-buffer').Writer;
const { applyMask } = require('./utils.js');
const { OPCODE } = require('./constants.js');

const TYPE = OPCODE;

const INT_PARAMS = { littleEndian: false, unsigned: true };
const BIT = {
  NO: 0,
  MASK: 0x80,
  OPCODE: 0xF,
  FIN: 0x80,
  LENGTH: 0x7F,
};

const COLLECTOR_STEPS = [
  {
    id: 'flags',
    length: 2,
    callback: function (data) {
      const flags = data.readUInt8(0);
      const lenFlags = data.readUInt8(1);
      const length = 0x7f & lenFlags;

      return {
        fin: 0x80 & flags,
        opcode: 0xf & flags,
        mask: 0x80 & lenFlags ? 4 : 0,
        lengthBytes: length === 126
          ? 2
          : length === 127
            ? 8
            : 0,

        length: 0x7f & lenFlags,
      };
    }
  },
  {
    id: 'length',
    length: ({ flags }) => flags.lengthBytes,
    callback: function (data, { flags }) {
      switch (data.length) {
        case 2:
          return data.readUInt16BE();
        case 8:
          return parseInt(data.readBigUInt64BE(), 10);
        default:
          return flags.length;
      }
    },
  },
  {
    id: 'mask',
    length: ({ flags }) => flags.mask,
    callback: function (data) {
      return data.length ? data : null;
    },
  },
  {
    id: 'data',
    length: ({ length }) => length,
    callback: function (data, { mask }) {
      return mask ? applyMask(data) : data;
    },
  }
];

function decode (data) {
  const reader = new Reader(data);
  const flags = reader.readUIntBE();
  const lenFlags = reader.readUIntBE();
  const fin = BIT.FIN & flags;
  const opcode = BIT.OPCODE & flags;
  let mask = BIT.MASK & lenFlags;
  let length = BIT.LENGTH & lenFlags;
  switch (length) {
    case 126:
      length = reader.readUIntBE(2);
      break;
    case 127:
      length = reader.readUIntBE(8);
      break;
  }
  mask && (mask = reader.slice(4));
  const encodedData = reader.slice(length);
  const decodedData = mask ? applyMask(encodedData, mask) : encodedData;
  return {
    fin: fin ? true : false,
    type: opcode,
    data: decodedData
  };
}

function encode (data, params = {}) {
  const opcode = params.opcode || TYPE.TEXT;
  const mask = params.mask || null;
  const finBit = params.fin === false ? BIT.NO : BIT.FIN;

  if (!(data instanceof Buffer)) {
    data = Buffer.from(data);
  }
  const payloadLength = data.length;
  let flags = finBit | opcode;
  const maskBit = mask ? BIT.MASK : 0;
  const dataToSend = mask ? applyMask(data, mask) : data;

  const result = [
    Writer.Integer(flags, 1, INT_PARAMS).is('Flags')
  ];

  if (payloadLength < 126) {
    result.push(
      Writer.Integer(maskBit | payloadLength, 1, INT_PARAMS).is('Payload length with mask bit')
    );
  } else if (payloadLength < 0x10000) {
    result.push(
      Writer.Integer(maskBit | 126, 1, INT_PARAMS).is('Extended payload length indicator with mask bit'),
      Writer.Integer(payloadLength, 2, INT_PARAMS).is('Payload length')
    );
  } else {
    result.push(
      Writer.Integer(maskBit | 127, 1, INT_PARAMS).is('Extended payload length indicator with mask bit'),
      Writer.Integer(payloadLength, 4, INT_PARAMS).is('Payload length')
    );
  }

  if (mask) {
    result.push(Writer.Buffer(mask).is('Mask Key'));
  }

  result.push(Writer.Buffer(dataToSend).is('Payload'));
  return Writer.make(result);
}

module.exports = {
  encode: encode,
  decode: decode,
  TYPE: TYPE,
  COLLECTOR_STEPS: COLLECTOR_STEPS,
};
