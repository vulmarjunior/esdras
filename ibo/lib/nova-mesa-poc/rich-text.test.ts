import { describe, expect, it } from "vitest";
import { markRange, plainText, toRuns } from "./rich-text";

describe("formatação da nova minuta", () => {
  it("aplica negrito somente à seleção", () => {
    const runs = markRange(toRuns("Igreja Batista"), 7, 14, "bold");
    expect(runs).toEqual([
      { text: "Igreja ", marks: [] },
      { text: "Batista", marks: ["bold"] },
    ]);
    expect(plainText(runs)).toBe("Igreja Batista");
  });
});
