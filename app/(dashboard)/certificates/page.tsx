"use client";

import { useState, useEffect } from "react";
import { Download, Award, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Completion {
  id: string;
  courseId: string | null;
  learningPlanId: string | null;
  completedAt: string;
  certificateUrl: string | null;
  certificateGeneratedAt: string | null;
  badgeAwarded: boolean;
  badgeAwardedAt: string | null;
  course: {
    id: string;
    title: string;
    code: string | null;
    hasCertificate: boolean;
  } | null;
  learningPlan: {
    id: string;
    title: string;
    code: string | null;
    hasCertificate: boolean;
  } | null;
}

export default function CertificatesPage() {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletions = async () => {
      try {
        const response = await fetch("/api/completions");
        if (!response.ok) throw new Error("Failed to fetch completions");

        const data = await response.json();
        setCompletions(data.completions);
      } catch (error) {
        console.error("Error fetching completions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletions();
  }, []);

  const handleGenerateCertificate = async (completionId: string) => {
    try {
      const response = await fetch(`/api/completions/${completionId}/certificate`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to generate certificate");

      await response.json();
      // Refresh completions
      const completionsResponse = await fetch("/api/completions");
      if (completionsResponse.ok) {
        const completionsData = await completionsResponse.json();
        setCompletions(completionsData.completions);
      }
    } catch (error) {
      console.error("Error generating certificate:", error);
      alert("Failed to generate certificate");
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8">Loading certificates...</div>;
  }

  const certificates = completions.filter(
    (c) => c.course?.hasCertificate || c.learningPlan?.hasCertificate
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Certificates & Badges</h1>

      {certificates.length === 0 ? (
        <Card className="p-8 text-center">
          <Award className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600">You haven't earned any certificates yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            Complete courses or learning plans to earn certificates.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {certificates.map((completion) => {
            const title = completion.course?.title || completion.learningPlan?.title || "Course";
            const code = completion.course?.code || completion.learningPlan?.code;

            return (
              <Card key={completion.id} className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-8 w-8 text-yellow-500" />
                    <div>
                      <h3 className="font-semibold">Certificate of Completion</h3>
                      {code && <p className="text-sm text-gray-500">{code}</p>}
                    </div>
                  </div>
                  {completion.badgeAwarded && (
                    <Badge variant="success">Badge Earned</Badge>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen className="h-4 w-4" />
                    <span className="font-medium">{title}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Completed on {new Date(completion.completedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  {completion.certificateUrl ? (
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => {
                        window.open(completion.certificateUrl || "", "_blank");
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Certificate
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleGenerateCertificate(completion.id)}
                    >
                      Generate Certificate
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Show all completions, not just those with certificates */}
      {completions.length > certificates.length && (
        <div className="mt-8">
          <h2 className="mb-4 text-2xl font-semibold">All Completions</h2>
          <div className="space-y-2">
            {completions
              .filter((c) => !c.course?.hasCertificate && !c.learningPlan?.hasCertificate)
              .map((completion) => {
                const title = completion.course?.title || completion.learningPlan?.title || "Course";
                return (
                  <Card key={completion.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{title}</p>
                        <p className="text-sm text-gray-500">
                          Completed on {new Date(completion.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="success">Completed</Badge>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

