"use client";

import dynamic from "next/dynamic";

// Lazy load the video player to improve initial page load
export const VideoPlayerLazy = dynamic(
  () => import("./video-player").then((mod) => ({ default: mod.VideoPlayer })),
  {
    loading: () => (
      <div className="flex h-96 items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 dark:border-blue-400 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading video player...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

