import { signOut } from "./signOut";

describe("signOut", () => {
  it("throws when firebase auth is not configured", async () => {
    await expect(signOut()).rejects.toThrow(
      "Firebase Authentication is not configured.",
    );
  });
});
