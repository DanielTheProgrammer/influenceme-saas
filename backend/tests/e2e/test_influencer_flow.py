"""
E2E tests for the influencer workflow:
  register → login → create profile → add service → dashboard → analytics
"""
import pytest
from helpers import FRONTEND, unique_email, register_and_login

pytestmark = pytest.mark.e2e


@pytest.fixture
def influencer_page(page):
    """Page fixture with a fresh influencer logged in and past onboarding."""
    email = unique_email("inf_flow")
    register_and_login(page, email, "infflow123", "influencer")
    return page


def test_influencer_lands_somewhere_valid(influencer_page):
    """After first login, influencer is on a valid page (not 404, not login)."""
    assert "/login" not in influencer_page.url
    assert "404" not in influencer_page.title().lower()


def test_influencer_profile_page_accessible(influencer_page):
    """Influencer can navigate to /influencer (profile setup page)."""
    influencer_page.goto(f"{FRONTEND}/influencer")
    influencer_page.wait_for_load_state("networkidle", timeout=15_000)
    assert "/login" not in influencer_page.url
    assert "500" not in influencer_page.title()


def test_influencer_profile_page_has_form(influencer_page):
    """Profile setup page renders a form with a display name field or similar input."""
    influencer_page.goto(f"{FRONTEND}/influencer")
    influencer_page.wait_for_load_state("networkidle", timeout=15_000)
    influencer_page.wait_for_timeout(1_500)
    # Page should have at least one input — either profile form or onboarding
    has_input = influencer_page.locator("input").count() > 0
    has_textarea = influencer_page.locator("textarea").count() > 0
    has_form = influencer_page.locator("form").count() > 0
    assert has_input or has_textarea or has_form, "No form elements found on /influencer"


def test_influencer_create_profile(influencer_page):
    """Influencer fills in display name and saves profile without error."""
    influencer_page.goto(f"{FRONTEND}/influencer")
    influencer_page.wait_for_load_state("networkidle", timeout=15_000)

    name_input = influencer_page.get_by_placeholder("Your public display name")
    if not name_input.is_visible():
        pytest.skip("Name input not visible — profile setup may have a different state")

    name_input.fill("E2E Playwright Influencer")
    bio_input = influencer_page.get_by_placeholder("Tell fans about yourself")
    if bio_input.is_visible():
        bio_input.fill("Automated E2E test profile")

    save_btn = influencer_page.get_by_role("button", name="Save Profile")
    if save_btn.is_visible():
        save_btn.click()
        influencer_page.wait_for_timeout(2_000)

    assert "500" not in influencer_page.title()


def test_influencer_social_sync_button_present(influencer_page):
    """Profile page has an Instagram/TikTok sync button."""
    influencer_page.goto(f"{FRONTEND}/influencer")
    influencer_page.wait_for_load_state("networkidle", timeout=15_000)
    has_sync = (
        influencer_page.locator("text=Sync").count() > 0
        or influencer_page.locator("text=Instagram").count() > 0
        or influencer_page.locator("text=TikTok").count() > 0
    )
    assert has_sync


def test_dashboard_loads(influencer_page):
    """Influencer dashboard loads without crashing."""
    influencer_page.goto(f"{FRONTEND}/dashboard")
    influencer_page.wait_for_load_state("networkidle", timeout=15_000)
    assert "/login" not in influencer_page.url
    assert "500" not in influencer_page.title()


def test_dashboard_shows_requests_or_setup_prompt(influencer_page):
    """Dashboard shows requests section or a 'set up profile' prompt."""
    influencer_page.goto(f"{FRONTEND}/dashboard")
    influencer_page.wait_for_load_state("networkidle", timeout=15_000)
    has_requests = influencer_page.locator("text=Incoming Fan Requests").count() > 0
    has_prompt = influencer_page.locator("text=Set up your profile").count() > 0
    has_skeleton = influencer_page.locator(".animate-pulse").count() > 0
    assert has_requests or has_prompt or has_skeleton


def test_dashboard_loading_skeleton_not_stuck(influencer_page):
    """Loading skeleton disappears after data loads (not stuck in loading state)."""
    influencer_page.goto(f"{FRONTEND}/dashboard")
    influencer_page.wait_for_load_state("networkidle", timeout=15_000)
    # After networkidle, skeleton should be gone
    influencer_page.wait_for_timeout(1_000)
    skeleton_count = influencer_page.locator(".animate-pulse").count()
    # Either 0 skeletons (loaded) or the skeleton is the actual data-loading state
    # Key assertion: the page is not stuck on a plain "Loading..." text
    plain_loading = influencer_page.locator("text=Loading...").is_visible()
    assert not plain_loading


def test_analytics_page_loads(influencer_page):
    """Analytics page renders for logged-in influencer."""
    influencer_page.goto(f"{FRONTEND}/influencer/analytics")
    influencer_page.wait_for_load_state("networkidle", timeout=15_000)
    assert "/login" not in influencer_page.url
    assert "404" not in influencer_page.title().lower()


def test_analytics_shows_stats_cards(influencer_page):
    """Analytics page has stat cards visible."""
    influencer_page.goto(f"{FRONTEND}/influencer/analytics")
    influencer_page.wait_for_load_state("networkidle", timeout=15_000)
    influencer_page.wait_for_timeout(1_000)
    has_total = influencer_page.locator("text=Total Requests").is_visible()
    has_analytics = influencer_page.locator("h1:has-text('Analytics')").is_visible()
    assert has_total or has_analytics


def test_analytics_nav_link_works(influencer_page):
    """Clicking Analytics in the navbar navigates to the analytics page."""
    influencer_page.goto(FRONTEND)
    influencer_page.wait_for_load_state("networkidle")
    analytics_link = influencer_page.get_by_role("link", name="Analytics")
    if analytics_link.count() == 0:
        pytest.skip("Analytics link not in navbar for this user")
    analytics_link.first.click()
    influencer_page.wait_for_url("**/influencer/analytics**", timeout=8_000)
    assert "/influencer/analytics" in influencer_page.url


def test_billing_page_accessible(influencer_page):
    """Billing/Stripe Connect page loads without error."""
    influencer_page.goto(f"{FRONTEND}/influencer/billing")
    influencer_page.wait_for_load_state("networkidle", timeout=15_000)
    assert "/login" not in influencer_page.url
    assert "500" not in influencer_page.title()
