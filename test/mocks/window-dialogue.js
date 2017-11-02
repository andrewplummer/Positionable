(function() {

  var nativeConfirm = window.confirm;
  var nativePrompt  = window.prompt;

  var confirmCalls, promptCalls;

  class WindowDialogueMock {

    apply() {
      confirmCalls = 0;
      promptCalls  = 0;
      window.confirm = confirmMock;
      window.prompt  = promptMock;
    }

    release() {
      window.confirm = nativeConfirm;
      window.prompt  = nativePrompt;
      confirmCalls = 0;
      promptCalls  = 0;
    }

    getConfirmCalls() {
      return confirmCalls;
    }

    getPromptCalls() {
      return promptCalls;
    }

  }

  function confirmMock() {
    confirmCalls += 1;
    return true;
  }

  function promptMock() {
    promptCalls += 1;
    return true;
  }

  window.windowDialogueMock = new WindowDialogueMock();

})();
