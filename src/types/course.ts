export interface Course {
  id: string;
  code?: string;
  title: string;
  shortDescription?: string;
  description: string;
  thumbnail?: string;
  coverImage?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  type: "E-LEARNING" | "ILT" | "VILT";
  estimatedTime?: number;
  difficultyLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  selfEnrollment: boolean;
  requiresApproval: boolean;
  maxEnrollments?: number;
  publicAccess: boolean;
  sequentialRequired: boolean;
  allowSkipping: boolean;
  categoryId?: string;
  tags: string[];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentItem {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  type: "VIDEO" | "PDF" | "PPT" | "TEST" | "HTML";
  order: number;
  priority: number;
  required: boolean;
  videoUrl?: string;
  videoDuration?: number;
  completionThreshold: number;
  allowSeeking: boolean;
  pdfUrl?: string;
  pdfPages?: number;
  pptUrl?: string;
  pptSlides?: number;
  htmlContent?: string;
  externalUrl?: string;
  externalType?: string;
}

export interface LearningPlan {
  id: string;
  code?: string;
  title: string;
  shortDescription?: string;
  description: string;
  thumbnail?: string;
  coverImage?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  estimatedTime?: number;
  difficultyLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  selfEnrollment: boolean;
  requiresApproval: boolean;
  maxEnrollments?: number;
  publicAccess: boolean;
  hasCertificate: boolean;
  hasBadge: boolean;
  categoryId?: string;
  tags: string[];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

