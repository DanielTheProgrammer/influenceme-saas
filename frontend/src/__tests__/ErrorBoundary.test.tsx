import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "@/components/ErrorBoundary";

// Component that throws on demand
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) throw new Error("Boom!");
    return <div>Safe content</div>;
}

// Suppress console.error for expected throws
beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
    (console.error as jest.Mock).mockRestore();
});

describe("ErrorBoundary", () => {
    it("renders children when there is no error", () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow={false} />
            </ErrorBoundary>
        );
        expect(screen.getByText("Safe content")).toBeInTheDocument();
    });

    it("renders fallback UI on error", () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        expect(screen.getByText("Boom!")).toBeInTheDocument();
    });

    it("renders custom fallback when provided", () => {
        render(
            <ErrorBoundary fallback={<div>Custom error UI</div>}>
                <Bomb shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText("Custom error UI")).toBeInTheDocument();
        expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });

    it("shows Try again and Go home buttons in default fallback", () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /go home/i })).toBeInTheDocument();
    });

    it("resets error state when Try again is clicked", () => {
        // Use a mutable ref so Bomb stops throwing before the reset re-render
        const throwRef = { current: true };
        function ControllableBomb() {
            if (throwRef.current) throw new Error("Boom!");
            return <div>Safe content</div>;
        }

        render(
            <ErrorBoundary>
                <ControllableBomb />
            </ErrorBoundary>
        );
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();

        throwRef.current = false;
        fireEvent.click(screen.getByRole("button", { name: /try again/i }));

        expect(screen.getByText("Safe content")).toBeInTheDocument();
    });
});
