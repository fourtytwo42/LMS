"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  contentItemId: string;
  videoUrl: string;
  videoDuration?: number; // Duration in seconds from content item
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
  videoDuration,
  completionThreshold = 0.8,
  allowSeeking = true,
  onProgressUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState({
    watchTime: 0,
    totalDuration: videoDuration || 0, // Use stored duration if available
    lastPosition: 0,
    completed: false,
  });
  const [currentTime, setCurrentTime] = useState(0); // Track current time for display
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

  // Update progress when video metadata loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      // Use video duration if available, otherwise use stored duration
      const duration = video.duration && !isNaN(video.duration) && isFinite(video.duration)
        ? Math.floor(video.duration)
        : (videoDuration || 0);
      
      setProgress((prev) => ({
        ...prev,
        totalDuration: duration,
      }));
      setLoading(false);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    
    // If video already has metadata, handle it immediately
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoDuration]);

  // Update progress periodically
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = async () => {
      if (!video.duration || isNaN(video.duration) || !isFinite(video.duration)) {
        return;
      }

      const currentTime = video.currentTime;
      const duration = video.duration;
      const watchTime = Math.floor(currentTime);
      const totalDuration = Math.floor(duration);
      const lastPosition = duration > 0 ? currentTime / duration : 0;
      const completionPercentage = duration > 0 ? watchTime / totalDuration : 0;
      const completed = completionPercentage >= completionThreshold;

      const newProgress = {
        watchTime,
        totalDuration,
        lastPosition,
        completed,
      };

      setProgress(newProgress);

      // Only update server if we have valid duration
      if (totalDuration > 0) {
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
            // Always call onProgressUpdate when progress changes, not just when next is unlocked
            if (onProgressUpdate) {
              onProgressUpdate({
                watchTime: newProgress.watchTime,
                totalDuration: newProgress.totalDuration,
                lastPosition: newProgress.lastPosition,
                completed: newProgress.completed,
              });
            }
          }
        } catch (error) {
          console.error("Error updating video progress:", error);
        }
      }
    };

    // Update every 5 seconds
    progressUpdateIntervalRef.current = setInterval(updateProgress, 5000);

    // Also update on timeupdate (more frequent for UI)
    const handleTimeUpdate = () => {
      const video = videoRef.current;
      if (!video) return;
      
      const currentTimeValue = video.currentTime || 0;
      setCurrentTime(currentTimeValue); // Update current time for display
      
      if (!video.duration || isNaN(video.duration) || !isFinite(video.duration)) {
        return;
      }
      
      const duration = video.duration;
      const watchTime = Math.floor(currentTimeValue);
      const totalDuration = Math.floor(duration);
      const lastPosition = duration > 0 ? currentTimeValue / duration : 0;
      const completionPercentage = duration > 0 ? watchTime / totalDuration : 0;
      const completed = completionPercentage >= completionThreshold;

      setProgress((prev) => ({
        ...prev,
        watchTime,
        totalDuration,
        lastPosition,
        completed,
      }));
    };

    // Add event listener to the video element
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener("timeupdate", handleTimeUpdate);
    }

    return () => {
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      }
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
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          const currentTimeValue = video.currentTime || 0;
          setCurrentTime(currentTimeValue);
          
          // Also update progress state
          if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
            const duration = video.duration;
            const watchTime = Math.floor(currentTimeValue);
            const totalDuration = Math.floor(duration);
            const lastPosition = duration > 0 ? currentTimeValue / duration : 0;
            const completionPercentage = duration > 0 ? watchTime / totalDuration : 0;
            const completed = completionPercentage >= completionThreshold;
            
            setProgress((prev) => ({
              ...prev,
              watchTime,
              totalDuration,
              lastPosition,
              completed,
            }));
          }
        }}
      />
      {progress.completed && (
        <div className="mt-4 rounded-lg bg-green-100 dark:bg-green-900 p-4 text-green-800 dark:text-green-200">
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
      {progress.totalDuration > 0 && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Progress: {Math.round(progress.lastPosition * 100)}% (
          {Math.floor(currentTime / 60)}:
          {String(Math.floor(currentTime % 60)).padStart(2, "0")} /{" "}
          {Math.floor(progress.totalDuration / 60)}:
          {String(Math.floor(progress.totalDuration % 60)).padStart(2, "0")})
        </div>
      )}
    </div>
  );
}

