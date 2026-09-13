import { describe, it, expect } from "vitest";
import { metadata } from "@/app/layout";

describe("Root Layout (src/app/layout.tsx)", () => {
  it("defines correct metadata title and description", () => {
    expect(metadata.title).toBe("AI Interview Coach");
    expect(metadata.description).toBe(
      "Practice technical interviews with an AI-powered interviewer"
    );
  });
});
