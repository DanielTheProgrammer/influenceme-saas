"""Tests for GenAI preview endpoint."""


def test_generate_preview_requires_auth(client):
    res = client.post("/genai/generate-preview", json={"prompt": "test"})
    assert res.status_code == 401


def test_generate_preview_returns_url(client, fan_token):
    auth = {"Authorization": f"Bearer {fan_token}"}
    res = client.post("/genai/generate-preview", headers=auth, json={
        "prompt": "A beautiful sunset over the ocean",
        "influencer_id": None,
    })
    assert res.status_code == 201
    data = res.json()
    assert "watermarked_url" in data
    assert data["watermarked_url"].startswith("https://")


def test_generate_preview_different_prompts_give_different_urls(client, fan_token):
    auth = {"Authorization": f"Bearer {fan_token}"}

    res1 = client.post("/genai/generate-preview", headers=auth, json={"prompt": "dogs playing in a park"})
    res2 = client.post("/genai/generate-preview", headers=auth, json={"prompt": "cats sitting on a roof"})

    assert res1.status_code == 201
    assert res2.status_code == 201
    assert res1.json()["watermarked_url"] != res2.json()["watermarked_url"]


def test_generate_preview_with_influencer_id(client, influencer_token, fan_token):
    inf_auth = {"Authorization": f"Bearer {influencer_token}"}
    fan_auth = {"Authorization": f"Bearer {fan_token}"}

    profile = client.post("/influencers/profile", headers=inf_auth, json={
        "display_name": "GenAI Test Inf",
        "bio": None,
        "instagram_handle": "genai_test_handle",
        "tiktok_handle": None,
        "profile_picture_url": None,
    }).json()

    res = client.post("/genai/generate-preview", headers=fan_auth, json={
        "prompt": "A fan selfie with the influencer",
        "influencer_id": profile["id"],
    })
    assert res.status_code == 201
    assert "watermarked_url" in res.json()
