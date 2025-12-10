"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  contentItemId: string;
  videoUrl: string;
  completionThreshold?: number;
  allowSeeking?: boolean;
  onProgressUpdate?: (progress: {
    watchTime: number;
    totalDuration: number;
    lastPosition: number;
    completed: boolean;
  }) => void;
}

export function VideoPlayer({
  contentItemId,
  videoUrl,
  completionThreshold = 0.8,
  allowSeeking = true,
  onProgressUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState({
    watchTime: 0,
    totalDuration: 0,
    lastPosition: 0,
    completed: false,
  });
  const [loading, setLoading] = useState(true);
  const progressUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial progress
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/progress/video/${contentItemId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.lastPosition > 0 && videoRef.current) {
            // Will set time after metadata loads
            videoRef.current.addEventListener("loadedmetadata", () => {
              if (videoRef.current && data.totalDuration > 0) {
                videoRef.current.currentTime = data.lastPosition * data.totalDuration;
              }
            });
          }
          setProgress({
            watchTime: data.watchTime || 0,
            totalDuration: data.totalDuration || 0,
            lastPosition: data.lastPosition || 0,
            completed: data.completed || false,
          });
        }
      } catch (error) {
        console.error("Error loading video progress:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [contentItemId]);

  // Update progress periodically
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = async () => {
      const watchTime = Math.floor(video.currentTime);
      const totalDuration = Math.floor(video.duration);
      const lastPosition = totalDuration > 0 ? video.currentTime / totalDuration : 0;
      const completionPercentage = totalDuration > 0 ? watchTime / totalDuration : 0;
      const completed = completionPercentage >= completionThreshold;

      const newProgress = {
        watchTime,
        totalDuration,
        lastPosition,
        completed,
      };

      setProgress(newProgress);

      // Update server every 5 seconds
      try {
        const response = await fetch("/api/progress/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentItemId,
            watchTime,
            totalDuration,
            lastPosition,
            timesWatched: completed ? 1 : 0,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.unlockedNext && onProgressUpdate) {
            onProgressUpdate(newProgress);
          }
        }
      } catch (error) {
        console.error("Error updating video progress:", error);
      }
    };

    // Update every 5 seconds
    progressUpdateIntervalRef.current = setInterval(updateProgress, 5000);

    // Also update on timeupdate (more frequent for UI)
    video.addEventListener("timeupdate", () => {
      const watchTime = Math.floor(video.currentTime);
      const totalDuration = Math.floor(video.duration);
      const lastPosition = totalDuration > 0 ? video.currentTime / totalDuration : 0;
      const completionPercentage = totalDuration > 0 ? watchTime / totalDuration : 0;
      const completed = completionPercentage >= completionThreshold;

      setProgress({
        watchTime,
        totalDuration,
        lastPosition,
        completed,
      });
    });

    return () => {
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
      video.removeEventListener("timeupdate", updateProgress);
    };
  }, [contentItemId, completionThreshold, onProgressUpdate]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-gray-900">
        <div className="text-white">Loading video...</div>
      </div>
    );
  }

  return (
    <div className="video-player w-full">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        controlsList={allowSeeking ? undefined : "nodownload nofullscreen"}
        className="w-full rounded-lg"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      {progress.completed && (
        <div className="mt-4 rounded-lg bg-green-100 p-4 text-green-800">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-semibold">Video completed! Next content unlocked.</span>
          </div>
        </div>
      )}
      <div className="mt-2 text-sm text-gray-600">
        Progress: {Math.round(progress.lastPosition * 100)}% (
        {Math.floor(progress.watchTime / 60)}:
        {String(Math.floor(progress.watchTime % 60)).padStart(2, "0")} /{" "}
        {Math.floor(progress.totalDuration / 60)}:
        {String(Math.floor(progress.totalDuration % 60)).padStart(2, "0")})
      </div>
    </div>
  );
}

