import { getProjects } from "./getProjects";

describe("getProjects", () => {
  it("returns empty array when firebase db is not configured", async () => {
    const result = await getProjects();
    expect(result).toEqual([]);
  });
});
