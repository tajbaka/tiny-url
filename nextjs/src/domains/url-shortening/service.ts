const API_BASE_URL = "http://localhost:3000/api";

export interface ShortenUrlResponse {
  shortUrl: string;
}

export const urlShorteningService = {
  shortenUrl: async (longUrl: string): Promise<ShortenUrlResponse> => {
    const response = await fetch(`${API_BASE_URL}/shorten`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ longUrl }),
    });

    if (!response.ok) {
      throw new Error("Failed to shorten URL");
    }

    return response.json();
  },
};
