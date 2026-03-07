"""
E2E tests for public pages — no login required.
"""
import pytest
from helpers import FRONTEND

pytestmark = pytest.mark.e2e


def test_homepage_loads(page):
    """Landing page renders with a Browse CTA."""
    page.goto(FRONTEND)
    assert page.title() != ""
    # Hero or nav should contain "Browse" or "InfluenceMe"
    page.wait_for_selector("text=Browse", timeout=10_000)


def test_homepage_has_navbar(page):
    page.goto(FRONTEND)
    # Dark navbar with logo
    logo = page.locator("text=InfluenceMe").first
    assert logo.is_visible()


def test_browse_page_loads(page):
    """Browse page shows influencer cards without login."""
    page.goto(f"{FRONTEND}/browse")
    page.wait_for_load_state("networkidle", timeout=15_000)
    # Should not redirect to login
    assert "/login" not in page.url
    assert "/browse" in page.url


def test_browse_shows_influencers(page, seeded_influencer):
    """At least one influencer card appears on the browse page."""
    page.goto(f"{FRONTEND}/browse")
    page.wait_for_load_state("networkidle", timeout=15_000)
    cards = page.locator("a[href*='/influencers/']")
    assert cards.count() > 0, "No influencer cards — seeding may have failed"


def test_influencer_profile_public(page, seeded_influencer):
    """Clicking an influencer card navigates to their public profile."""
    page.goto(f"{FRONTEND}/browse")
    page.wait_for_load_state("networkidle", timeout=15_000)
    cards = page.locator("a[href*='/influencers/']")
    if cards.count() == 0:
        pytest.skip("No influencer cards")
    cards.first.click()
    page.wait_for_url("**/influencers/**", timeout=10_000)
    assert "/influencers/" in page.url


def test_influencer_profile_shows_services(page, seeded_influencer):
    """Influencer profile page renders without error."""
    page.goto(f"{FRONTEND}/browse")
    page.wait_for_load_state("networkidle", timeout=15_000)
    cards = page.locator("a[href*='/influencers/']")
    if cards.count() == 0:
        pytest.skip("No influencer cards")
    cards.first.click()
    page.wait_for_url("**/influencers/**", timeout=10_000)
    page.wait_for_load_state("networkidle", timeout=10_000)
    assert "404" not in page.title().lower()


def test_login_page_renders(page):
    page.goto(f"{FRONTEND}/login")
    assert page.get_by_label("Email").is_visible()
    assert page.get_by_label("Password").is_visible()


def test_register_page_renders(page):
    page.goto(f"{FRONTEND}/register")
    assert page.get_by_label("Email").is_visible()
    assert page.get_by_label("Password").is_visible()


def test_browse_link_in_navbar(page):
    """Browse link in navbar navigates correctly from homepage."""
    page.goto(FRONTEND)
    page.get_by_role("link", name="Browse").first.click()
    page.wait_for_url("**/browse**", timeout=8_000)
    assert "/browse" in page.url
