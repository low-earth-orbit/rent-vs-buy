import { DEFAULTS } from "./presets";
import { validateUserInput } from "./validation";

describe("mortgage validation", () => {
  test("accepts the default conventional mortgage assumptions", () => {
    expect(validateUserInput(DEFAULTS)).toEqual({});
  });

  test("requires at least 20% down", () => {
    const errors = validateUserInput({
      ...DEFAULTS,
      downPaymentPercentage: 19,
    });

    expect(errors.downPaymentPercentage).toBe("Must be between 20 and 100");
  });

  test("caps amortization at 25 years", () => {
    const errors = validateUserInput({
      ...DEFAULTS,
      amortization: 30,
    });

    expect(errors.amortization).toBe("Must be between 5 and 25");
  });
});
