
fdescribe('PaymentManager', function(uiRoot) {

  var manager, listener;

  setup(function() {
    googlePaymentsMock.apply();
    consoleMock.apply();
    listener = new Listener();
    manager  = new PaymentManager(listener);
  });

  teardown(function() {
    googlePaymentsMock.release();
    consoleMock.release();
    listener = null;
    manager  = null;
  });

  class Listener {

    constructor() {
    }

    onPaymentStatusUpdated(paid) {
      this.state = paid;
    }

  }

  const GET_PURCHASES_UNPAID_USER_RESPONSE = {
    response: {
      details: []
    }
  };

  const GET_PURCHASES_PAID_USER_RESPONSE = {
    response: {
      details: [
        {
          kind: 'chromewebstore#payment',
          itemId: 'ejjblkkckapifkameijedjhnobkjkejn',
          sku: 'positionable_pro_test',
          createdTime: '1509447490638',
          state: 'ACTIVE'
        }
      ]
    }
  };

  const BUY_SUCCESS_RESPONSE = {
    jwt: 'xxx',
    request: {
      cartId: '00000000000000000000.0000000000000000000'
    },
    response: {
      orderId: '00000000000000000000.0000000000000000000'
    }
  };

  var BUY_CANCELED_RESPONSE = {
    request: {},
    response: {
      errorType: 'PURCHASE_CANCELED'
    }
  };

  // --- Initializing

  it('should not fire events on init when false', function() {
    manager.initialize(false);
    assert.equal(listener.state, undefined);
  });

  it('should not fire events on init when true', function() {
    manager.initialize(true);
    assert.equal(listener.state, undefined);
  });

  // --- Checking Payment

  it('should not fire events on init when getPurchases API fails', function() {
    manager.initialize();
    assert.equal(listener.state, undefined);
    assert.equal(consoleMock.getErrorCount(), 1);
  });

  it('should check the license on init for a user with no payment', function() {
    googlePaymentsMock.setGetPurchasesSuccessResponse(GET_PURCHASES_UNPAID_USER_RESPONSE);
    manager.initialize();
    assert.equal(listener.state, false);
  });

  it('should check the license on init for a user with a payment', function() {
    googlePaymentsMock.setGetPurchasesSuccessResponse(GET_PURCHASES_PAID_USER_RESPONSE);
    manager.initialize();
    assert.equal(listener.state, true);
  });

  // --- Making Payment

  it('should not fire events on init when buy API fails', function() {
    manager.initiatePayment();
    assert.equal(listener.state, undefined);
  });

  it('should fire an event when payment successfully completed', function() {
    googlePaymentsMock.setBuySuccessResponse(BUY_SUCCESS_RESPONSE);
    manager.initiatePayment();
    assert.equal(listener.state, true);
  });

  it('should not fire an event or error when user cancels payment', function() {
    googlePaymentsMock.setBuyFailureResponse(BUY_CANCELED_RESPONSE);
    manager.initiatePayment();
    assert.equal(listener.state, undefined);
    assert.equal(consoleMock.getErrorCount(), 0);
  });

});
