
describe('LicenseManager', function() {

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

  const GET_PURCHASES_NONE_RESPONSE = {
    response: {
      details: []
    }
  };

  const GET_PURCHASES_ACTIVE_RESPONSE = {
    response: {
      details: [
        {
          kind: 'chromewebstore#payment',
          itemId: 'ejjblkkckapifkameijedjhnobkjkejn',
          sku: 'positionable_pro',
          createdTime: '1509447490638',
          state: 'ACTIVE'
        }
      ]
    }
  };

  const GET_PURCHASES_PENDING_RESPONSE = {
    response: {
      details: [
        {
          kind: 'chromewebstore#payment',
          itemId: 'ejjblkkckapifkameijedjhnobkjkejn',
          sku: 'positionable_pro',
          createdTime: '1509447490638',
          state: 'PENDING'
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

  const BUY_FAILURE_BUG_RESPONSE = {
    checkoutOrderId: '00000000000000000000.0000000000000000000'
  };

  var PURCHASE_CANCELED_RESPONSE = {
    request: {},
    response: {
      errorType: 'PURCHASE_CANCELED'
    }
  };

  class Listener {

    constructor() {
      this.licenseUpdatedEvents   = 0;
      this.licensePurchasedEvents = 0;
    }

    onLicensePurchased() {
      this.licensePurchasedEvents += 1;
    }

    onLicenseUpdated() {
      this.licenseUpdatedEvents += 1;
    }

  }

  // Just to make things clearer
  const SKU                 = LicenseManager.SKU;
  const PRO_LICENSE         = LicenseManager.STATUS_PRO;
  const NORMAL_LICENSE      = LicenseManager.STATUS_NORMAL;
  const STATUS_KEY          = LicenseManager.STORAGE_KEY_STATUS;
  const UPDATED_KEY         = LicenseManager.STORAGE_KEY_UPDATED;
  const ACTIVATED_KEY       = LicenseManager.STORAGE_KEY_ACTIVATED;

  function days(n) {
    return n * 24 * 60 * 60 * 1000;
  }

  function setupLicenseManager() {
    listener = new Listener();
    manager  = new LicenseManager(listener);
  }

  function setStorageLicenseStatus(status, maxAge) {
    chromeMock.setStoredData(STATUS_KEY,  status);
    chromeMock.setStoredData(UPDATED_KEY, maxAge || Date.now());
  }

  function setStorageActivatedDate(date) {
    chromeMock.setStoredData(ACTIVATED_KEY, date);
  }

  function assertProLicense(expected) {
    assert.equal(manager.hasProLicense(), expected);
  }

  function assertDaysRemaining(expected) {
    assert.equalWithTolerance(manager.freeTimeRemaining(), days(expected), 50);
  }

  function assertStorageLicenseStatus(expected) {
    var status = chromeMock.getStoredData(STATUS_KEY);
    assert.equal(status, expected);
  }

  function assertStorageActivatedDate(expected) {
    var date = chromeMock.getStoredData(ACTIVATED_KEY);
    assert.equalWithTolerance(date, expected, 50);
  }

  function assertStorageUpdatedDate(expected) {
    var date = chromeMock.getStoredData(UPDATED_KEY);
    assert.equalWithTolerance(date, expected, 50);
  }

  function assertCorrectBuyOptions() {
    var requests = googlePaymentsMock.getRequests();
    assert.equal(requests[0].sku, SKU);
  }

  // --- Querying GetPurchases

  it('should correctly identify a fresh license on init', function() {
    googlePaymentsMock.queueSuccessResponse(GET_PURCHASES_NONE_RESPONSE);
    setupLicenseManager();
    assertProLicense(false);
    assertDaysRemaining(30);
    assert.equal(listener.licenseUpdatedEvents, 1);
  });

  it('should correctly identify a pro license on init', function() {
    googlePaymentsMock.queueSuccessResponse(GET_PURCHASES_ACTIVE_RESPONSE);
    setupLicenseManager();
    assertProLicense(true);
    assertDaysRemaining(30);
    assert.equal(listener.licenseUpdatedEvents, 1);
  });

  it('should correctly identify a pro license with a pending status', function() {
    googlePaymentsMock.queueSuccessResponse(GET_PURCHASES_PENDING_RESPONSE);
    setupLicenseManager();
    assertProLicense(true);
    assertDaysRemaining(30);
    assert.equal(listener.licenseUpdatedEvents, 1);
  });

  it('should set storage after checking a fresh license on init', function() {
    googlePaymentsMock.queueSuccessResponse(GET_PURCHASES_NONE_RESPONSE);
    setupLicenseManager();
    assertStorageLicenseStatus(NORMAL_LICENSE);
    assertStorageActivatedDate(Date.now());
  });

  it('should read storage before checking a fresh license on init', function() {
    setStorageLicenseStatus(NORMAL_LICENSE);
    setupLicenseManager();
    assertProLicense(false);
    assertDaysRemaining(30);
  });

  it('should set storage after checking a pro license on init', function() {
    googlePaymentsMock.queueSuccessResponse(GET_PURCHASES_ACTIVE_RESPONSE);
    setupLicenseManager();
    assertStorageLicenseStatus(PRO_LICENSE);
    assertStorageActivatedDate(Date.now());
  });

  it('should read storage before checking a pro license on init', function() {
    setStorageLicenseStatus(PRO_LICENSE);
    setupLicenseManager();
    assertProLicense(true);
    assertDaysRemaining(30);
  });

  it('should identify a normal license whose time is running out', function() {
    setStorageLicenseStatus(NORMAL_LICENSE);
    setStorageActivatedDate(Date.now() - days(24));
    setupLicenseManager();
    assertDaysRemaining(6);
  });

  it('should not allow days remaining to go negative', function() {
    setStorageLicenseStatus(NORMAL_LICENSE);
    setStorageActivatedDate(Date.now() - days(100));
    setupLicenseManager();
    assertDaysRemaining(0);
  });

  it('should not fire events on init when getPurchases API fails', function() {
    consoleMock.apply();
    setupLicenseManager();
    assert.equal(listener.licenseUpdatedEvents, 0);
    assert.equal(consoleMock.getErrorCount(), 1);
    consoleMock.release();
  });

  // --- Making a purchase

  it('should not fire events on init when buy API fails', function() {
    consoleMock.apply();
    setStorageLicenseStatus(NORMAL_LICENSE);
    setupLicenseManager();

    manager.purchase();

    assertCorrectBuyOptions();
    assert.equal(listener.licenseUpdatedEvents, 1);
    assert.equal(consoleMock.getErrorCount(), 1);
    consoleMock.release();
  });

  it('should fire an event when payment successfully completed', function() {
    setStorageLicenseStatus(NORMAL_LICENSE);
    setupLicenseManager();

    googlePaymentsMock.queueSuccessResponse(BUY_SUCCESS_RESPONSE);
    manager.purchase();

    assertCorrectBuyOptions();
    assert.equal(listener.licenseUpdatedEvents, 2);
    assertProLicense(true);
  });

  it('should not fire an event or error when user cancels payment', function() {
    consoleMock.apply();
    setStorageLicenseStatus(NORMAL_LICENSE);
    setupLicenseManager();

    googlePaymentsMock.queueFailureResponse(PURCHASE_CANCELED_RESPONSE);
    manager.purchase();

    assertCorrectBuyOptions();
    assert.equal(listener.licenseUpdatedEvents, 1);
    assert.equal(consoleMock.getErrorCount(), 0);
    consoleMock.release();
  });

  // --- Updating the storage cache

  it('should store the updated field when checking the license', function() {
    setStorageLicenseStatus(NORMAL_LICENSE);

    googlePaymentsMock.queueSuccessResponse(GET_PURCHASES_NONE_RESPONSE);
    setupLicenseManager();

    assertStorageUpdatedDate(Date.now());
  });

  it('should re-check license after 1 week', function() {
    setStorageLicenseStatus(PRO_LICENSE, Date.now() - days(7));

    googlePaymentsMock.queueSuccessResponse(GET_PURCHASES_NONE_RESPONSE);
    setupLicenseManager();

    assertProLicense(false);
    assertStorageLicenseStatus(NORMAL_LICENSE);
  });

  it('should not re-check license before 1 week', function() {
    setStorageLicenseStatus(PRO_LICENSE, Date.now() - days(6));

    googlePaymentsMock.queueSuccessResponse(GET_PURCHASES_NONE_RESPONSE);
    setupLicenseManager();

    assertProLicense(true);
    assertStorageLicenseStatus(PRO_LICENSE);
  });

  // --- License Purchased Events

  it('should fire an event when the user purchases a license', function() {
    setStorageLicenseStatus(NORMAL_LICENSE);
    setupLicenseManager();

    googlePaymentsMock.queueSuccessResponse(BUY_SUCCESS_RESPONSE);
    manager.purchase();

    assert.equal(listener.licenseUpdatedEvents,   2);
    assert.equal(listener.licensePurchasedEvents, 1);
  });

  it('should not fire a purchased event on simple init for pro user', function() {
    googlePaymentsMock.queueSuccessResponse(GET_PURCHASES_ACTIVE_RESPONSE);
    setupLicenseManager();

    assert.equal(listener.licenseUpdatedEvents,   1);
    assert.equal(listener.licensePurchasedEvents, 0);
  });

  // --- Inapp purchases bug

  it('should account for purchases bug where success comes back as failure', function() {
    setStorageLicenseStatus(NORMAL_LICENSE);
    setupLicenseManager();

    googlePaymentsMock.queueFailureResponse(BUY_FAILURE_BUG_RESPONSE);
    manager.purchase();

    assertProLicense(true);
    assertStorageLicenseStatus(PRO_LICENSE);
  });

});
