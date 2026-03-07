import { render, screen } from "@testing-library/react";
import InfluencerCard from "@/components/InfluencerCard";

// next/link and next/image are mocked by next/jest automatically

const baseInfluencer = {
    id: 1,
    display_name: "Jane Doe",
    bio: "Fitness coach and lifestyle creator",
    profile_picture_url: "https://unavatar.io/instagram/janedoe",
    instagram_handle: "janedoe",
    tiktok_handle: null,
    followers_count: 54500,
    viral_video_url: null,
    services: [
        { engagement_type: "story_tag", price: 50, duration_days: 1 },
        { engagement_type: "permanent_follow", price: 120 },
        { engagement_type: "comment", price: 30 },
        { engagement_type: "post_tag", price: 200 },
    ],
};

describe("InfluencerCard", () => {
    it("renders the influencer display name", () => {
        render(<InfluencerCard influencer={baseInfluencer} />);
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("renders the handle", () => {
        render(<InfluencerCard influencer={baseInfluencer} />);
        expect(screen.getByText("@janedoe")).toBeInTheDocument();
    });

    it("shows formatted follower count", () => {
        render(<InfluencerCard influencer={baseInfluencer} />);
        expect(screen.getByText("54.5K followers")).toBeInTheDocument();
    });

    it("shows min price badge", () => {
        // Standard card splits "from" and "$30" into separate elements
        render(<InfluencerCard influencer={baseInfluencer} />);
        expect(screen.getByText("from")).toBeInTheDocument();
        expect(screen.getByText("$30")).toBeInTheDocument();
    });

    it("shows inline price badge on video card", () => {
        const withVideo = { ...baseInfluencer, viral_video_url: "https://example.com/v.mp4" };
        render(<InfluencerCard influencer={withVideo} />);
        expect(screen.getByText("from $30")).toBeInTheDocument();
    });

    it("renders up to 3 service pills", () => {
        render(<InfluencerCard influencer={baseInfluencer} />);
        // 4 services but only 3 shown + overflow badge
        expect(screen.getByText("+1")).toBeInTheDocument();
    });

    it("links to the influencer profile page", () => {
        render(<InfluencerCard influencer={baseInfluencer} />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/influencers/1");
    });

    it("uses video card layout when viral_video_url is set", () => {
        const withVideo = { ...baseInfluencer, viral_video_url: "https://example.com/video.mp4" };
        render(<InfluencerCard influencer={withVideo} />);
        const video = document.querySelector("video");
        expect(video).toBeInTheDocument();
        expect(video).toHaveAttribute("src", "https://example.com/video.mp4");
    });

    it("falls back to standard card when viral_video_url is null", () => {
        render(<InfluencerCard influencer={baseInfluencer} />);
        expect(document.querySelector("video")).not.toBeInTheDocument();
    });

    it("shows bio text", () => {
        render(<InfluencerCard influencer={baseInfluencer} />);
        expect(screen.getByText("Fitness coach and lifestyle creator")).toBeInTheDocument();
    });

    it("handles missing followers count gracefully", () => {
        const noFollowers = { ...baseInfluencer, followers_count: null };
        render(<InfluencerCard influencer={noFollowers} />);
        expect(screen.queryByText(/followers/)).not.toBeInTheDocument();
    });

    it("renders initial avatar when no profile picture", () => {
        const noPic = { ...baseInfluencer, profile_picture_url: null };
        render(<InfluencerCard influencer={noPic} />);
        expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("renders empty services section gracefully", () => {
        const noServices = { ...baseInfluencer, services: [] };
        render(<InfluencerCard influencer={noServices} />);
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
        expect(screen.queryByText("from $")).not.toBeInTheDocument();
    });

    it("shows tiktok handle when instagram is absent", () => {
        const tiktokOnly = { ...baseInfluencer, instagram_handle: null, tiktok_handle: "janedoetiktok" };
        render(<InfluencerCard influencer={tiktokOnly} />);
        expect(screen.getByText("@janedoetiktok")).toBeInTheDocument();
    });
});
