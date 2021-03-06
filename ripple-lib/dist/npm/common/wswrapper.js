'use strict'; // eslint-disable-line strict

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('events'),
    EventEmitter = _require.EventEmitter;

function unsused() {}

/**
 * Provides `EventEmitter` interface for native browser `WebSocket`,
 * same, as `ws` package provides.
 */

var WSWrapper = function (_EventEmitter) {
  _inherits(WSWrapper, _EventEmitter);

  function WSWrapper(url) {
    var protocols = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var websocketOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, WSWrapper);

    var _this = _possibleConstructorReturn(this, (WSWrapper.__proto__ || Object.getPrototypeOf(WSWrapper)).call(this));

    unsused(protocols);
    unsused(websocketOptions);
    _this.setMaxListeners(Infinity);

    _this._ws = new WebSocket(url);

    _this._ws.onclose = function () {
      _this.emit('close');
    };

    _this._ws.onopen = function () {
      _this.emit('open');
    };

    _this._ws.onerror = function (error) {
      _this.emit('error', error);
    };

    _this._ws.onmessage = function (message) {
      _this.emit('message', message.data);
    };
    return _this;
  }

  _createClass(WSWrapper, [{
    key: 'close',
    value: function close() {
      if (this.readyState === 1) {
        this._ws.close();
      }
    }
  }, {
    key: 'send',
    value: function send(message) {
      this._ws.send(message);
    }
  }, {
    key: 'readyState',
    get: function get() {
      return this._ws.readyState;
    }
  }]);

  return WSWrapper;
}(EventEmitter);

WSWrapper.CONNECTING = 0;
WSWrapper.OPEN = 1;
WSWrapper.CLOSING = 2;
WSWrapper.CLOSED = 3;

module.exports = WSWrapper;