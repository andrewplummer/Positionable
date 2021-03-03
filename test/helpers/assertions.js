window.assertEqualWithTolerance = createAssertion((arg1, arg2, tolerance) => {
  return {
    pass: (arg1 >= arg2 - tolerance) && (arg1 <= arg2 + tolerance),
    message: `${arg1} should be within ${tolerance} of ${arg2}`,
  };
});
