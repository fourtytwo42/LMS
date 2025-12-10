import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/input";

describe("Input Component", () => {
  it("should render input element", () => {
    render(<Input id="test-input" />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("should handle onChange events", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input id="test-input" onChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "test value");

    expect(handleChange).toHaveBeenCalled();
  });

  it("should display error message", () => {
    render(<Input id="test-input" error="This field is required" />);

    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Input id="test-input" disabled />);

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it("should display placeholder text", () => {
    render(<Input id="test-input" placeholder="Enter text here" />);

    const input = screen.getByPlaceholderText("Enter text here");
    expect(input).toBeInTheDocument();
  });

  it("should support different input types", () => {
    const { rerender, container } = render(<Input id="test-input" type="email" />);

    let input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");

    rerender(<Input id="test-input" type="password" />);
    input = container.querySelector('input[type="password"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
  });

  it("should render icon when provided", () => {
    const Icon = () => <span data-testid="icon">Icon</span>;
    render(<Input id="test-input" icon={<Icon />} />);

    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});

