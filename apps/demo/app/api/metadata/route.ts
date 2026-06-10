import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Use microlink.io to fetch metadata and generate thumbnail
    // screenshot=true로 스크린샷 생성, embed 없이 JSON 응답 받기
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`;

    console.log("Fetching metadata from:", microlinkUrl);

    const response = await fetch(microlinkUrl, {
      headers: {
        "User-Agent": "i18nexus-showcase/1.0",
        Accept: "application/json",
      },
      // 15초 타임아웃 (스크린샷 생성 시간 고려)
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(
        "❌ Microlink API error:",
        response.status,
        response.statusText
      );

      // Rate limit 에러인 경우
      if (response.status === 429) {
        return NextResponse.json(
          {
            error: "Metadata service rate limit exceeded",
            details: "Please try again later",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Metadata service error occurred",
          details: `HTTP ${response.status}: ${response.statusText}`,
        },
        { status: 500 }
      );
    }

    // Content-Type 확인
    const contentType = response.headers.get("content-type");
    console.log("Response content-type:", contentType);

    if (!contentType?.includes("application/json")) {
      console.error("❌ Unexpected content type:", contentType);
      return NextResponse.json(
        {
          error: "Metadata service returned unexpected response",
          details: `Expected JSON but got ${contentType}`,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("Microlink response status:", data.status);

    if (data.status !== "success") {
      console.error("❌ Microlink returned error:", data);

      // Microlink가 URL에 접근할 수 없는 경우
      if (data.status === "fail" && data.message?.includes("ENOTFOUND")) {
        return NextResponse.json(
          {
            error: "Cannot access URL",
            details: "Domain does not exist or is inaccessible",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to extract metadata",
          details: data.message || "Unknown error from metadata service",
        },
        { status: 500 }
      );
    }

    // Extract metadata from microlink response
    // og:image를 우선 사용하고, 없으면 스크린샷 사용
    const ogImage = data.data?.image?.url;
    const screenshotImage = data.data?.screenshot?.url;

    const metadata = {
      autoTitle: data.data?.title || data.data?.url || "Untitled Project",
      autoDescription: data.data?.description || "No description available",
      thumbnailUrl: ogImage || screenshotImage || "/default-thumbnail.svg",
      screenshotUrl: screenshotImage || null, // 상세보기용 스크린샷
      ogImageUrl: ogImage || null, // 원본 메타 이미지
      url,
    };

    console.log("Metadata extracted successfully:", {
      hasOgImage: !!ogImage,
      hasScreenshot: !!screenshotImage,
    });
    return NextResponse.json(metadata);
  } catch (error: unknown) {
    console.error("❌ Metadata fetch error:", error);

    const errorObj = error as { message?: string };

    return NextResponse.json(
      {
        error: "Failed to fetch metadata",
        details: errorObj.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
