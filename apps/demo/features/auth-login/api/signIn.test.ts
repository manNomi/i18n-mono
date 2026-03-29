import { signIn } from "./signIn";

describe("signIn", () => {
  it("throws when firebase auth is not configured", async () => {
    await expect(signIn("user@example.com", "password")).rejects.toThrow(
      "Firebase Authentication is not configured."
    );
  });
});
