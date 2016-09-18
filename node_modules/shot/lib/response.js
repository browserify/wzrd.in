'use strict';

// Load modules

const Http = require('http');
const Util = require('util');

// Declare internals

const internals = {};


exports = module.exports = internals.Response = function (req, onEnd) {

    Http.ServerResponse.call(this, { method: req.method, httpVersionMajor: 1, httpVersionMinor: 1 });

    this.once('finish', () => {

        const res = internals.payload(this);
        res.raw.req = req;
        process.nextTick(() => onEnd(res));
    });
};

Util.inherits(internals.Response, Http.ServerResponse);


internals.Response.prototype.writeHead = function () {

    const headers = ((arguments.length === 2 && typeof arguments[1] === 'object') ? arguments[1] : (arguments.length === 3 ? arguments[2] : {}));
    const result = Http.ServerResponse.prototype.writeHead.apply(this, arguments);

    this._headers = this._headers || {};
    const keys = Object.keys(headers);
    for (let i = 0; i < keys.length; ++i) {
        this._headers[keys[i]] = headers[keys[i]];
    }

    // Add raw headers

    ['Date', 'Connection', 'Transfer-Encoding'].forEach((name) => {

        const regex = new RegExp('\\r\\n' + name + ': ([^\\r]*)\\r\\n');
        const field = this._header.match(regex);
        if (field) {
            this._headers[name.toLowerCase()] = field[1];
        }
    });

    return result;
};


internals.Response.prototype.write = function (data, encoding) {

    Http.ServerResponse.prototype.write.call(this, data, encoding);
    return true;                                                    // Write always returns false when disconnected
};


internals.Response.prototype.end = function (data, encoding) {

    Http.ServerResponse.prototype.end.call(this, data, encoding);
    this.emit('finish');                                            // Will not be emitted when disconnected
};


internals.Response.prototype.destroy = function () {

};


internals.payload = function (response) {

    // Prepare response object

    const res = {
        raw: {
            res: response
        },
        headers: response._headers,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        trailers: {}
    };

    // Read payload

    const raw = [];
    let rawLength = 0;
    for (let i = 0; i < response.output.length; ++i) {
        const chunk = (response.output[i] instanceof Buffer ? response.output[i] : new Buffer(response.output[i], response.outputEncodings[i]));
        raw.push(chunk);
        rawLength = rawLength + chunk.length;
    }

    const rawBuffer = Buffer.concat(raw, rawLength);

    // Parse payload

    res.payload = '';

    const CRLF = '\r\n';
    const sep = new Buffer(CRLF + CRLF);
    const parts = internals.splitBufferInTwo(rawBuffer, sep);
    const payloadBuffer = parts[1];

    if (!res.headers['transfer-encoding']) {
        res.rawPayload = payloadBuffer;
        res.payload = payloadBuffer.toString();
        return res;
    }

    const CRLFBuffer = new Buffer(CRLF);
    let rest = payloadBuffer;
    let payloadBytes = [];
    let size;
    do {
        const payloadParts = internals.splitBufferInTwo(rest, CRLFBuffer);
        const next = payloadParts[1];
        size = parseInt(payloadParts[0].toString(), 16);
        if (size === 0) {
            rest = next;
        }
        else {
            const nextData = next.slice(0, size);
            payloadBytes = payloadBytes.concat(Array.prototype.slice.call(nextData, 0));
            rest = next.slice(size + 2);
        }
    }
    while (size);

    res.rawPayload = new Buffer(payloadBytes);
    res.payload = res.rawPayload.toString('utf8');

    // Parse trailers

    const trailerLines = rest.toString().split(CRLF);
    trailerLines.forEach((line) => {

        const trailerParts = line.split(':');
        if (trailerParts.length === 2) {
            res.trailers[trailerParts[0].trim().toLowerCase()] = trailerParts[1].trim();
        }
    });

    return res;
};


internals.splitBufferInTwo = function (buffer, seperator) {

    for (let i = 0; i < buffer.length - seperator.length; ++i) {
        if (internals.bufferEqual(buffer.slice(i, i + seperator.length), seperator)) {
            const part1 = buffer.slice(0, i);
            const part2 = buffer.slice(i + seperator.length);
            return [part1, part2];
        }
    }

    return [buffer, new Buffer(0)];
};


internals.bufferEqual = function (a, b) {

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
};
