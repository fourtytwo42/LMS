import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/card";

describe("Card Component", () => {
  it("should render card with children", () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );

    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("should render card with multiple children", () => {
    render(
      <Card>
        <h2>Card Title</h2>
        <p>Card content</p>
        <button>Action</button>
      </Card>
    );

    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <Card className="custom-class">
        <p>Card content</p>
      </Card>
    );

    const card = container.querySelector(".custom-class");
    expect(card).toBeInTheDocument();
  });

  it("should apply default styling", () => {
    const { container } = render(
      <Card>
        <p>Card content</p>
      </Card>
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("rounded-lg");
    expect(card.className).toContain("border");
    expect(card.className).toContain("bg-white");
  });
});

