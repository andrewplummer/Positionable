
describe('PaymentManager', function(uiRoot) {

  var manager, listener;

  setup(function() {
    googlePaymentsMock.apply();
    chromeMock.apply();
  });

  teardown(function() {
    googlePaymentsMock.release();
    chromeMock.release();
    listener = null;
    manager  = null;
  });

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

  class Listener {

    constructor() {
      this.userStatusUpdatedEvents = 0;
    }

    onUserStatusUpdated() {
      this.userStatusUpdatedEvents += 1;
    }

  }

  // Just to make things clearer
  const PRO_USER            = PaymentManager.USER_STATUS_PRO;
  const NORMAL_USER         = PaymentManager.USER_STATUS_NORMAL;
  const USER_STATUS_KEY     = PaymentManager.STORAGE_KEY_USER_STATUS;
  const ACTIVATION_DATE_KEY = PaymentManager.STORAGE_KEY_ACTIVATION_DATE;

  function days(n) {
    return n * 24 * 60 * 60 * 1000;
  }

  function setStorageUserStatus(status) {
    chromeMock.setStoredData(USER_STATUS_KEY, status);
  }

  function setStorageActivationDate(date) {
    chromeMock.setStoredData(ACTIVATION_DATE_KEY, date);
  }

  function setupPaymentManager() {
    listener = new Listener();
    manager  = new PaymentManager(listener);
  }

  function assertProUser(expected) {
    assert.equal(manager.isProUser(), expected);
  }

  function assertDaysRemaining(expected) {
    assert.equalWithTolerance(manager.freeTimeRemaining(), days(expected), 50);
  }

  function assertStorageUserStatus(expected) {
    var status = chromeMock.getStoredData(USER_STATUS_KEY);
    assert.equal(status, expected);
  }

  function assertStorageActivationDate(expected) {
    var date = chromeMock.getStoredData(ACTIVATION_DATE_KEY);
    assert.equalWithTolerance(date, expected, 50);
  }

  // --- Querying User Status

  it('should correctly identify a fresh user on init', function() {
    googlePaymentsMock.setGetPurchasesSuccessResponse(GET_PURCHASES_UNPAID_USER_RESPONSE);
    setupPaymentManager();
    assertProUser(false);
    assertDaysRemaining(60);
    assert.equal(listener.userStatusUpdatedEvents, 1);
  });

  it('should correctly identify a pro user on init', function() {
    googlePaymentsMock.setGetPurchasesSuccessResponse(GET_PURCHASES_PAID_USER_RESPONSE);
    setupPaymentManager();
    assertProUser(true);
    assertDaysRemaining(60);
    assert.equal(listener.userStatusUpdatedEvents, 1);
  });

  it('should set storage after checking a fresh user on init', function() {
    googlePaymentsMock.setGetPurchasesSuccessResponse(GET_PURCHASES_UNPAID_USER_RESPONSE);
    setupPaymentManager();
    assertStorageUserStatus(NORMAL_USER);
    assertStorageActivationDate(Date.now());
  });

  it('should read storage before checking a fresh user on init', function() {
    setStorageUserStatus(NORMAL_USER);
    setupPaymentManager();
    assertProUser(false);
    assertDaysRemaining(60);
  });

  it('should set storage after checking a pro user on init', function() {
    googlePaymentsMock.setGetPurchasesSuccessResponse(GET_PURCHASES_PAID_USER_RESPONSE);
    setupPaymentManager();
    assertStorageUserStatus(PRO_USER);
    assertStorageActivationDate(Date.now());
  });

  it('should read storage before checking a pro user on init', function() {
    setStorageUserStatus(PRO_USER);
    setupPaymentManager();
    assertProUser(true);
    assertDaysRemaining(60);
  });

  it('should identify a normal user whose time is running out', function() {
    setStorageUserStatus(NORMAL_USER);
    setStorageActivationDate(Date.now() - days(24));
    setupPaymentManager();
    assertDaysRemaining(36);
  });

  it('should not allow days remaining to go negative', function() {
    setStorageUserStatus(NORMAL_USER);
    setStorageActivationDate(Date.now() - days(100));
    setupPaymentManager();
    assertDaysRemaining(0);
  });

  it('should not fire events on init when getPurchases API fails', function() {
    consoleMock.apply();
    setupPaymentManager();
    assert.equal(listener.userStatusUpdatedEvents, 0);
    assert.equal(consoleMock.getErrorCount(), 1);
    consoleMock.release();
  });

  // --- Making Payment

  it('should not fire events on init when buy API fails', function() {
    consoleMock.apply();
    setStorageUserStatus(NORMAL_USER);
    setupPaymentManager();

    manager.initiatePayment();

    assert.equal(listener.userStatusUpdatedEvents, 1);
    assert.equal(consoleMock.getErrorCount(), 1);
    consoleMock.release();
  });

  it('should fire an event when payment successfully completed', function() {
    setStorageUserStatus(NORMAL_USER);
    googlePaymentsMock.setBuySuccessResponse(BUY_SUCCESS_RESPONSE);
    setupPaymentManager();

    manager.initiatePayment();

    assert.equal(listener.userStatusUpdatedEvents, 2);
    assertProUser(true);
  });

  it('should not fire an event or error when user cancels payment', function() {
    consoleMock.apply();
    setStorageUserStatus(NORMAL_USER);
    googlePaymentsMock.setBuyFailureResponse(BUY_CANCELED_RESPONSE);
    setupPaymentManager();

    manager.initiatePayment();

    assert.equal(listener.userStatusUpdatedEvents, 1);
    assert.equal(consoleMock.getErrorCount(), 0);
    consoleMock.release();
  });

});
