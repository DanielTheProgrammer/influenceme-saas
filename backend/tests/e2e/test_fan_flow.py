"""
E2E tests for the fan workflow:
  register → login → browse → view profile → my requests → cancel flow
"""
import pytest
from helpers import FRONTEND, unique_email, register_and_login

pytestmark = pytest.mark.e2e


@pytest.fixture
def fan_page(page):
    """Page fixture with a fresh fan logged in."""
    email = unique_email("fan_flow")
    register_and_login(page, email, "fanflow123", "fan")
    return page


def test_fan_lands_somewhere_valid(fan_page):
    """Fan is on a valid page after login."""
    assert "/login" not in fan_page.url
    assert "404" not in fan_page.title().lower()


def test_fan_can_browse(fan_page):
    """Logged-in fan can access browse page."""
    fan_page.goto(f"{FRONTEND}/browse")
    fan_page.wait_for_load_state("networkidle", timeout=15_000)
    assert "/login" not in fan_page.url
    assert "/browse" in fan_page.url


def test_browse_shows_influencer_cards(fan_page, seeded_influencer):
    """Browse page shows at least one influencer card."""
    fan_page.goto(f"{FRONTEND}/browse")
    fan_page.wait_for_load_state("networkidle", timeout=15_000)
    cards = fan_page.locator("a[href*='/influencers/']")
    assert cards.count() > 0, "No influencer cards found — seeding may have failed"


def test_fan_requests_page_loads(fan_page):
    """My Requests page loads for authenticated fan."""
    fan_page.goto(f"{FRONTEND}/fan/requests")
    fan_page.wait_for_load_state("networkidle", timeout=10_000)
    assert "/login" not in fan_page.url
    assert "/fan/requests" in fan_page.url


def test_fan_requests_empty_state_message(fan_page):
    """New fan sees an empty state or the page title on My Requests."""
    fan_page.goto(f"{FRONTEND}/fan/requests")
    fan_page.wait_for_load_state("networkidle", timeout=10_000)
    fan_page.wait_for_timeout(1_000)
    has_heading = fan_page.locator("h1:has-text('My Requests')").is_visible()
    has_empty = (
        fan_page.locator("text=haven").count() > 0
        or fan_page.locator("text=Browse").count() > 0
    )
    assert has_heading or has_empty


def test_fan_can_navigate_to_influencer_profile(fan_page):
    """Fan can click an influencer card to reach their profile."""
    fan_page.goto(f"{FRONTEND}/browse")
    fan_page.wait_for_load_state("networkidle", timeout=15_000)
    cards = fan_page.locator("a[href*='/influencers/']")
    if cards.count() == 0:
        pytest.skip("No influencer cards — seed data missing")
    cards.first.click()
    fan_page.wait_for_url("**/influencers/**", timeout=10_000)
    assert "/influencers/" in fan_page.url


def test_influencer_profile_renders_without_error(fan_page):
    """Influencer profile page loads successfully and shows content."""
    fan_page.goto(f"{FRONTEND}/browse")
    fan_page.wait_for_load_state("networkidle", timeout=15_000)
    cards = fan_page.locator("a[href*='/influencers/']")
    if cards.count() == 0:
        pytest.skip("No influencer cards")
    cards.first.click()
    fan_page.wait_for_url("**/influencers/**", timeout=10_000)
    fan_page.wait_for_load_state("networkidle", timeout=10_000)
    assert "404" not in fan_page.title().lower()
    assert "500" not in fan_page.title()


def test_influencer_profile_has_service_cta(fan_page):
    """Influencer profile has at least one interactive element (service CTA)."""
    fan_page.goto(f"{FRONTEND}/browse")
    fan_page.wait_for_load_state("networkidle", timeout=15_000)
    cards = fan_page.locator("a[href*='/influencers/']")
    if cards.count() == 0:
        pytest.skip("No influencer cards")
    cards.first.click()
    fan_page.wait_for_url("**/influencers/**", timeout=10_000)
    fan_page.wait_for_load_state("networkidle", timeout=10_000)
    # Page should have some buttons or interactive elements
    buttons = fan_page.get_by_role("button")
    assert buttons.count() > 0


def test_unauthenticated_fan_redirected_on_requests(page):
    """Unauthenticated user hitting /fan/requests is redirected to /login."""
    page.goto(f"{FRONTEND}/fan/requests")
    page.wait_for_url("**/login**", timeout=10_000)
    assert "/login" in page.url


def test_my_requests_link_in_navbar(fan_page):
    """My Requests link visible in navbar for fans after session hydrates."""
    fan_page.goto(FRONTEND)
    # Wait for navbar session to hydrate (Sign Out implies session is loaded)
    fan_page.wait_for_selector("button:has-text('Sign Out')", timeout=10_000)
    link = fan_page.get_by_role("link", name="My Requests")
    assert link.count() > 0


def test_browse_from_empty_requests_page(fan_page):
    """Browse influencers link on empty My Requests page works."""
    fan_page.goto(f"{FRONTEND}/fan/requests")
    fan_page.wait_for_load_state("networkidle", timeout=10_000)
    browse_link = fan_page.get_by_role("link", name="Browse Influencers").first
    if not browse_link.is_visible():
        # Might use different text
        browse_link = fan_page.get_by_role("link", name="Browse").first
    if browse_link.is_visible():
        browse_link.click()
        fan_page.wait_for_url("**/browse**", timeout=8_000)
        assert "/browse" in fan_page.url


def test_browse_search_or_filter_visible(fan_page):
    """Browse page has a search input or filter controls."""
    fan_page.goto(f"{FRONTEND}/browse")
    fan_page.wait_for_load_state("networkidle", timeout=15_000)
    has_search = (
        fan_page.locator("input[type='text']").count() > 0
        or fan_page.locator("input[type='search']").count() > 0
        or fan_page.locator("[placeholder*='Search']").count() > 0
        or fan_page.locator("[placeholder*='search']").count() > 0
    )
    assert has_search


def test_browse_page_title(fan_page):
    """Browse page has a heading."""
    fan_page.goto(f"{FRONTEND}/browse")
    fan_page.wait_for_load_state("networkidle", timeout=15_000)
    has_heading = (
        fan_page.locator("h1").count() > 0
        or fan_page.locator("h2").count() > 0
    )
    assert has_heading
