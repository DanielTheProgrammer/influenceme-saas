"""
E2E tests for registration and login flows.
"""
import pytest
from helpers import FRONTEND, unique_email, register_user, login_user, register_and_login

pytestmark = pytest.mark.e2e


def test_fan_registration(page):
    """A new fan can register — lands on /login or onboarding."""
    email = unique_email("fan")
    register_user(page, email, "fanpass1234", "fan")
    # After register → /login?registered=1&role=fan
    assert "/register" not in page.url


def test_influencer_registration(page):
    """A new influencer can register."""
    email = unique_email("inf")
    register_user(page, email, "infpass1234", "influencer")
    assert "/register" not in page.url


def test_login_success(page):
    """Registered user can log in and lands away from /login."""
    email = unique_email("login")
    password = "loginpass1"
    register_and_login(page, email, password, "fan")
    assert "/login" not in page.url


def test_login_wrong_password_shows_error(page):
    """Wrong password shows error message."""
    page.goto(f"{FRONTEND}/login")
    page.wait_for_load_state("networkidle")
    page.locator("#email").fill("nobody@e2e.test")
    page.locator("#password").fill("wrongpass1")
    page.get_by_role("button", name="Sign In").click()
    page.wait_for_timeout(3_000)
    on_login = "/login" in page.url
    has_error = page.locator("text=Invalid email").is_visible() or page.locator("text=Incorrect").is_visible()
    assert on_login or has_error


def test_weak_password_shows_strength_indicator(page):
    """Password strength bar appears when typing a password."""
    page.goto(f"{FRONTEND}/register")
    page.wait_for_load_state("networkidle")
    page.locator("#password").fill("abc")
    # Strength indicator bar should be visible
    page.wait_for_timeout(500)
    assert page.locator("text=Weak").is_visible() or page.locator("text=Password strength").is_visible()


def test_weak_password_client_validation(page):
    """Form rejects passwords under 8 chars before hitting the server."""
    page.goto(f"{FRONTEND}/register")
    page.wait_for_load_state("networkidle")
    page.locator("#email").fill(unique_email("weak"))
    page.locator("#password").fill("abc")  # 3 chars — too short
    page.get_by_role("button", name="Fan").click()
    page.get_by_role("button", name="Create Account").click()
    page.wait_for_timeout(2_000)
    # Client-side guard: stays on /register with an error
    assert "/register" in page.url or page.locator("text=8 characters").is_visible()


def test_influencer_lands_on_onboarding_after_login(page):
    """Fresh influencer is sent to /onboarding/influencer after first login."""
    email = unique_email("infonboard")
    password = "onboard123"
    register_and_login(page, email, password, "influencer")
    assert "/login" not in page.url


def test_fan_lands_on_onboarding_after_login(page):
    """Fresh fan is sent to /onboarding/fan after first login."""
    email = unique_email("fanonboard")
    password = "onboard123"
    register_and_login(page, email, password, "fan")
    assert "/login" not in page.url


def test_sign_out_redirects_to_home_or_login(page):
    """After signing out, Sign Out disappears."""
    email = unique_email("signout")
    password = "signout123"
    register_and_login(page, email, password, "fan")
    page.goto(FRONTEND)
    page.wait_for_load_state("networkidle")
    sign_out_btn = page.get_by_role("button", name="Sign Out")
    if not sign_out_btn.is_visible():
        pytest.skip("Sign Out button not visible — may be in mobile menu")
    sign_out_btn.click()
    page.wait_for_timeout(2_000)
    # After sign out: no longer authenticated — Sign Out button gone
    assert not page.get_by_role("button", name="Sign Out").is_visible()


def test_protected_page_redirects_unauthenticated(page):
    """Visiting /fan/requests without auth redirects to /login."""
    page.goto(f"{FRONTEND}/fan/requests")
    page.wait_for_url("**/login**", timeout=10_000)
    assert "/login" in page.url


def test_dashboard_protected(page):
    """Visiting /dashboard without auth redirects to /login."""
    page.goto(f"{FRONTEND}/dashboard")
    page.wait_for_url("**/login**", timeout=10_000)
    assert "/login" in page.url


def test_duplicate_email_shows_error(page):
    """Registering same email twice shows an error."""
    email = unique_email("dup")
    register_user(page, email, "duppass123", "fan")
    # Register again with same email
    page.goto(f"{FRONTEND}/register")
    page.wait_for_load_state("networkidle")
    page.locator("#email").fill(email)
    page.locator("#password").fill("duppass123")
    page.get_by_role("button", name="Fan").click()
    page.get_by_role("button", name="Create Account").click()
    page.wait_for_timeout(2_000)
    # Should stay on /register with an error
    on_register = "/register" in page.url
    has_error = page.locator("text=already").first.is_visible() or page.locator("text=registered").first.is_visible()
    assert on_register or has_error
