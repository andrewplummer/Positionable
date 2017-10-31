(function() {

  if (!window.google) {
    window.google = {};
  }

  // Should be null when testing, but just in case.
  var nativePayments = google.payments, mockPayments;
  var getPurchasesSuccessResponse, getPurchasesFailureResponse;
  var buySuccessResponse, buyFailureResponse;

  var INVALID_RESPONSE_ERROR = {
    request: {},
    response: {
      errorType: 'INVALID_RESPONSE_ERROR'
    }
  };

  class GooglePaymentsMock {

    apply() {
      google.payments = mockPayments;
    }

    release() {
      google.payments = nativePayments;
      getPurchasesSuccessResponse = null;
      getPurchasesFailureResponse = null;
      buySuccessResponse = null;
      buyFailureResponse = null;
    }

    setGetPurchasesSuccessResponse(obj) {
      getPurchasesSuccessResponse = obj;
    }

    setGetPurchasesFailureResponse(obj) {
      getPurchasesFailureResponse = obj;
    }

    setBuySuccessResponse(obj) {
      buySuccessResponse = obj;
    }

    setBuyFailureResponse(obj) {
      buyFailureResponse = obj;
    }

  }

  mockPayments = {

    inapp: {

      getPurchases: function(opt) {
        if (getPurchasesSuccessResponse) {
          opt.success(getPurchasesSuccessResponse);
        } else if (getPurchasesFailureResponse) {
          opt.failure(getPurchasesFailureResponse);
        } else {
          opt.failure(INVALID_RESPONSE_ERROR);
        }
      },

      buy: function(opt) {
        if (buySuccessResponse) {
          opt.success(buySuccessResponse);
        } else if(buyFailureResponse) {
          opt.failure(buyFailureResponse);
        } else {
          opt.failure(INVALID_RESPONSE_ERROR);
        }
      }

    }

  };

  window.googlePaymentsMock = new GooglePaymentsMock();

})();
