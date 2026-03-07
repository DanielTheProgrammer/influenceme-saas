"""Shared constants and page-action helpers for E2E tests."""
import uuid
from playwright.sync_api import Page

FRONTEND = "http://localhost:3000"
API = "http://localhost:8000"


def unique_email(prefix: str) -> str:
    return f"{prefix}+{uuid.uuid4().hex[:8]}@example.com"


def register_user(page: Page, email: str, password: str, role: str) -> None:
    """
    Fill and submit the register form.
    Role buttons are plain <button type="button"> with text "Fan" / "Influencer".
    After submit, the server redirects to /login?registered=1&role=...
    """
    page.goto(f"{FRONTEND}/register")
    page.wait_for_load_state("networkidle")
    # Use id-based locators — labels have htmlFor="email" / "password"
    page.locator("#email").fill(email)
    page.locator("#password").fill(password)
    # Role toggle buttons (text "Fan" or "Influencer")
    page.get_by_role("button", name=role.capitalize()).click()
    page.get_by_role("button", name="Create Account").click()
    # Redirects to /login?registered=1 after successful registration
    page.wait_for_url(lambda url: "/register" not in url, timeout=15_000)


def login_user(page: Page, email: str, password: str) -> None:
    """
    Fill and submit the login form. After login, redirects away from /login.
    """
    page.goto(f"{FRONTEND}/login")
    page.wait_for_load_state("networkidle")
    page.locator("#email").fill(email)
    page.locator("#password").fill(password)
    page.get_by_role("button", name="Sign In").click()
    # Redirects to /onboarding/... or /dashboard
    page.wait_for_url(lambda url: "/login" not in url, timeout=15_000)


def register_and_login(page: Page, email: str, password: str, role: str) -> None:
    """Register then immediately log in — handles the /login?registered=1 redirect."""
    register_user(page, email, password, role)
    # After register, we're already on /login?registered=1 — just fill the form
    page.wait_for_load_state("networkidle")
    page.locator("#email").fill(email)
    page.locator("#password").fill(password)
    page.get_by_role("button", name="Sign In").click()
    page.wait_for_url(lambda url: "/login" not in url, timeout=15_000)
    # Wait for the navbar session to hydrate (Sign Out appears once useSession resolves)
    page.wait_for_selector("button:has-text('Sign Out')", timeout=10_000)
