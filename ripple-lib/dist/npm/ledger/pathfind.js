'use strict'; // eslint-disable-line strict

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _ = require('lodash');
var BigNumber = require('bignumber.js');
var utils = require('./utils');
var parsePathfind = require('./parse/pathfind');
var _utils$common = utils.common,
    validate = _utils$common.validate,
    toRippledAmount = _utils$common.toRippledAmount;

var NotFoundError = utils.common.errors.NotFoundError;
var ValidationError = utils.common.errors.ValidationError;


function addParams(request, result) {
  return _.defaults(_.assign({}, result, {
    source_account: request.source_account,
    source_currencies: request.source_currencies
  }), { destination_amount: request.destination_amount });
}

function requestPathFind(connection, pathfind) {
  var destinationAmount = _.assign({ value: -1 }, pathfind.destination.amount);
  var request = {
    command: 'ripple_path_find',
    source_account: pathfind.source.address,
    destination_account: pathfind.destination.address,
    destination_amount: toRippledAmount(destinationAmount)
  };
  if (_typeof(request.destination_amount) === 'object' && !request.destination_amount.issuer) {
    // Convert blank issuer to sender's address
    // (Ripple convention for 'any issuer')
    // https://ripple.com/build/transactions/
    //     #special-issuer-values-for-sendmax-and-amount
    // https://ripple.com/build/ripple-rest/#counterparties-in-payments
    request.destination_amount.issuer = request.destination_account;
  }
  if (pathfind.source.currencies && pathfind.source.currencies.length > 0) {
    request.source_currencies = pathfind.source.currencies.map(function (amount) {
      return _.omit(toRippledAmount(amount), 'value');
    });
  }
  if (pathfind.source.amount) {
    if (pathfind.destination.amount.value !== undefined) {
      throw new ValidationError('Cannot specify both source.amount' + ' and destination.amount.value in getPaths');
    }
    request.send_max = toRippledAmount(pathfind.source.amount);
    if (request.send_max.currency && !request.send_max.issuer) {
      request.send_max.issuer = pathfind.source.address;
    }
  }

  return connection.request(request).then(function (paths) {
    return addParams(request, paths);
  });
}

function addDirectXrpPath(paths, xrpBalance) {
  // Add XRP "path" only if the source acct has enough XRP to make the payment
  var destinationAmount = paths.destination_amount;
  if (new BigNumber(xrpBalance).greaterThanOrEqualTo(destinationAmount)) {
    paths.alternatives.unshift({
      paths_computed: [],
      source_amount: paths.destination_amount
    });
  }
  return paths;
}

function isRippledIOUAmount(amount) {
  // rippled XRP amounts are specified as decimal strings
  return (typeof amount === 'undefined' ? 'undefined' : _typeof(amount)) === 'object' && amount.currency && amount.currency !== 'XRP';
}

function conditionallyAddDirectXRPPath(connection, address, paths) {
  if (isRippledIOUAmount(paths.destination_amount) || !_.includes(paths.destination_currencies, 'XRP')) {
    return Promise.resolve(paths);
  }
  return utils.getXRPBalance(connection, address, undefined).then(function (xrpBalance) {
    return addDirectXrpPath(paths, xrpBalance);
  });
}

function filterSourceFundsLowPaths(pathfind, paths) {
  if (pathfind.source.amount && pathfind.destination.amount.value === undefined && paths.alternatives) {
    paths.alternatives = _.filter(paths.alternatives, function (alt) {
      return alt.source_amount && pathfind.source.amount && new BigNumber(alt.source_amount.value).eq(pathfind.source.amount.value);
    });
  }
  return paths;
}

function formatResponse(pathfind, paths) {
  if (paths.alternatives && paths.alternatives.length > 0) {
    return parsePathfind(paths);
  }
  if (paths.destination_currencies !== undefined && !_.includes(paths.destination_currencies, pathfind.destination.amount.currency)) {
    throw new NotFoundError('No paths found. ' + 'The destination_account does not accept ' + pathfind.destination.amount.currency + ', they only accept: ' + paths.destination_currencies.join(', '));
  } else if (paths.source_currencies && paths.source_currencies.length > 0) {
    throw new NotFoundError('No paths found. Please ensure' + ' that the source_account has sufficient funds to execute' + ' the payment in one of the specified source_currencies. If it does' + ' there may be insufficient liquidity in the network to execute' + ' this payment right now');
  } else {
    throw new NotFoundError('No paths found.' + ' Please ensure that the source_account has sufficient funds to' + ' execute the payment. If it does there may be insufficient liquidity' + ' in the network to execute this payment right now');
  }
}

function getPaths(pathfind) {
  var _this = this;

  validate.getPaths({ pathfind: pathfind });

  var address = pathfind.source.address;
  return requestPathFind(this.connection, pathfind).then(function (paths) {
    return conditionallyAddDirectXRPPath(_this.connection, address, paths);
  }).then(function (paths) {
    return filterSourceFundsLowPaths(pathfind, paths);
  }).then(function (paths) {
    return formatResponse(pathfind, paths);
  });
}

module.exports = getPaths;