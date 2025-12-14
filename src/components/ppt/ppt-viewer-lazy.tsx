"use client";

import dynamic from "next/dynamic";

// Use the image-based viewer instead of the canvas-based one
const PPTImageViewer = dynamic(() => import("./ppt-image-viewer").then((mod) => ({ default: mod.PPTImageViewer })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <div className="text-gray-600 dark:text-gray-400">Loading presentation viewer...</div>
    </div>
  ),
});

interface PPTViewerLazyProps {
  fileUrl: string;
  title?: string;
}

export function PPTViewerLazy({ fileUrl, title }: PPTViewerLazyProps) {
  return <PPTImageViewer pptUrl={fileUrl} title={title} />;
}

