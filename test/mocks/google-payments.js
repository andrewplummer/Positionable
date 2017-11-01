(function() {

  if (!window.google) {
    window.google = {};
  }

  // Should be null when testing, but just in case.
  var nativePayments = google.payments, mockPayments;
  var mockResponseQueue = [], requests = [];

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
      mockResponseQueue = [];
      requests = [];
    }

    getRequests() {
      return requests;
    }

    queueSuccessResponse(response) {
      mockResponseQueue.push({
        success: true,
        response: response
      });
    }

    queueFailureResponse(response) {
      mockResponseQueue.push({
        success: false,
        response: response
      });
    }

  }

  function mockCall(request) {
    var mockResponse = mockResponseQueue.shift();
    requests.push(request);
    if (!mockResponse) {
      request.failure(INVALID_RESPONSE_ERROR);
    } else if (mockResponse.success) {
      request.success(mockResponse.response);
    } else {
      request.failure(mockResponse.response);
    }
  }

  mockPayments = {

    inapp: {
      buy: mockCall,
      consume: mockCall,
      getPurchases: mockCall
    }

  };

  window.googlePaymentsMock = new GooglePaymentsMock();

})();
