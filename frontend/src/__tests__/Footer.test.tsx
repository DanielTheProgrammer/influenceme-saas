import { render, screen } from "@testing-library/react";
import Footer from "@/components/Footer";

describe("Footer", () => {
    it("renders brand name", () => {
        render(<Footer />);
        expect(screen.getByText("LEAKY")).toBeInTheDocument();
    });

    it("renders Privacy Policy link", () => {
        render(<Footer />);
        const link = screen.getByRole("link", { name: /privacy policy/i });
        expect(link).toHaveAttribute("href", "/privacy");
    });

    it("renders Terms of Service link", () => {
        render(<Footer />);
        const link = screen.getByRole("link", { name: /terms of service/i });
        expect(link).toHaveAttribute("href", "/terms");
    });

    it("renders Browse Creators and Sign Up navigation links", () => {
        render(<Footer />);
        expect(screen.getByRole("link", { name: "Browse Creators" })).toHaveAttribute("href", "/browse");
        expect(screen.getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", "/register");
    });

    it("renders copyright notice", () => {
        render(<Footer />);
        expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
    });
});
