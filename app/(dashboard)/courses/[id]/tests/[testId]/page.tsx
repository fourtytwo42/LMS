"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Question {
  id: string;
  type: string;
  questionText: string;
  points: number;
  options?: Array<{ text: string; correct?: boolean }>;
  order: number;
}

interface Test {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number | null;
  timeLimit: number | null;
  questions: Question[];
}

interface TestProgress {
  attempts: Array<{
    id: string;
    attemptNumber: number;
    score: number;
    passed: boolean;
    submittedAt: string;
  }>;
  bestScore: number;
  canRetake: boolean | null;
  remainingAttempts: number | null;
}

export default function TestPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const testId = params.testId as string;
  const [test, setTest] = useState<Test | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [takingTest, setTakingTest] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [testResponse, progressResponse] = await Promise.all([
          fetch(`/api/tests/${testId}`),
          fetch(`/api/progress/test/${testId}`),
        ]);

        if (!testResponse.ok) throw new Error("Failed to fetch test");
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          setProgress(progressData);
        }

        const testData = await testResponse.json();
        setTest(testData);
      } catch (error) {
        console.error("Error fetching test:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [testId]);

  // Timer for test
  useEffect(() => {
    if (!takingTest || !test?.timeLimit || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = test.timeLimit! * 60 - elapsed;
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        handleSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [takingTest, test?.timeLimit, startTime]);

  const handleStartTest = () => {
    setTakingTest(true);
    setStartTime(Date.now());
    if (test?.timeLimit) {
      setTimeRemaining(test.timeLimit * 60);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!test || !startTime) return;

    setSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        ...answer,
      }));

      const response = await fetch("/api/progress/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: test.id,
          answers: answerArray,
          timeSpent,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit test");

      const result = await response.json();
      setResults(result);
      setTakingTest(false);

      // Refresh progress
      const progressResponse = await fetch(`/api/progress/test/${testId}`);
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setProgress(progressData);
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      alert("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return <div className="container mx-auto py-8">Loading test...</div>;
  }

  if (!test) {
    return <div className="container mx-auto py-8">Test not found</div>;
  }

  if (results) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
          <div className="mb-6 text-center">
            {results.attempt.passed ? (
              <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
            ) : (
              <XCircle className="mx-auto h-16 w-16 text-red-600" />
            )}
            <h2 className="mt-4 text-2xl font-bold">
              {results.attempt.passed ? "Test Passed!" : "Test Failed"}
            </h2>
            <p className="mt-2 text-lg">
              Score: {Math.round(results.attempt.score * 100)}% (
              {results.attempt.pointsEarned}/{results.attempt.totalPoints} points)
            </p>
            <p className="text-gray-600">
              Passing Score: {Math.round(test.passingScore * 100)}%
            </p>
          </div>

          <div className="mb-6 space-y-4">
            <h3 className="text-xl font-semibold">Question Results</h3>
            {test.questions.map((question) => {
              const answerResult = results.answers.find(
                (a: any) => a.questionId === question.id
              );
              return (
                <div
                  key={question.id}
                  className={`rounded-lg border p-4 ${
                    answerResult?.isCorrect
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{question.questionText}</p>
                      {answerResult && (
                        <div className="mt-2 text-sm">
                          <p>
                            {answerResult.isCorrect ? (
                              <span className="text-green-600">✓ Correct</span>
                            ) : (
                              <span className="text-red-600">✗ Incorrect</span>
                            )}
                            {" - "}
                            {answerResult.pointsEarned} / {question.points} points
                          </p>
                          {!answerResult.isCorrect && answerResult.correctAnswer && (
                            <p className="mt-1 text-gray-600">
                              Correct answer: {answerResult.correctAnswer}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-4">
            <Button
              variant="secondary"
              onClick={() => router.push(`/courses/${courseId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Course
            </Button>
            {results.canRetake && (
              <Button onClick={() => window.location.reload()}>
                Retake Test
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (!takingTest) {
    return (
      <div className="container mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/courses/${courseId}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>

        <Card className="p-6">
          <h1 className="mb-4 text-3xl font-bold">{test.title}</h1>
          {test.description && (
            <p className="mb-6 text-gray-600">{test.description}</p>
          )}

          <div className="mb-6 space-y-2">
            <p>
              <strong>Passing Score:</strong> {Math.round(test.passingScore * 100)}%
            </p>
            {test.maxAttempts && (
              <p>
                <strong>Max Attempts:</strong> {test.maxAttempts}
                {progress && (
                  <span className="text-gray-600">
                    {" "}
                    ({progress.remainingAttempts} remaining)
                  </span>
                )}
              </p>
            )}
            {test.timeLimit && (
              <p>
                <strong>Time Limit:</strong> {test.timeLimit} minutes
              </p>
            )}
            <p>
              <strong>Questions:</strong> {test.questions.length}
            </p>
            <p>
              <strong>Total Points:</strong>{" "}
              {test.questions.reduce((sum, q) => sum + q.points, 0)}
            </p>
            {progress && progress.bestScore > 0 && (
              <p>
                <strong>Best Score:</strong> {Math.round(progress.bestScore * 100)}%
              </p>
            )}
          </div>

          {progress && !(progress.canRetake ?? false) && (
            <div className="mb-6 rounded-lg bg-yellow-100 p-4 text-yellow-800">
              You have reached the maximum number of attempts for this test.
            </div>
          )}

          <Button
            onClick={handleStartTest}
            disabled={progress ? !(progress.canRetake ?? false) : false}
            className="w-full"
          >
            {progress && !(progress.canRetake ?? false)
              ? "Maximum Attempts Reached"
              : "Start Test"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{test.title}</h1>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5" />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {test.questions.map((question, index) => (
            <div key={question.id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-start justify-between">
                <h3 className="text-lg font-semibold">
                  Question {index + 1} ({question.points} points)
                </h3>
              </div>
              <p className="mb-4">{question.questionText}</p>

              {question.type === "SINGLE_CHOICE" && question.options && (
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <label
                      key={optIndex}
                      className="flex items-center gap-2 rounded border p-2 hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={optIndex}
                        checked={
                          answers[question.id]?.selectedOptions?.[0] === optIndex
                        }
                        onChange={() =>
                          handleAnswerChange(question.id, {
                            selectedOptions: [optIndex],
                          })
                        }
                        className="h-4 w-4"
                      />
                      <span>{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === "MULTIPLE_CHOICE" && question.options && (
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <label
                      key={optIndex}
                      className="flex items-center gap-2 rounded border p-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={
                          answers[question.id]?.selectedOptions?.includes(optIndex) ||
                          false
                        }
                        onChange={(e) => {
                          const current = answers[question.id]?.selectedOptions || [];
                          const updated = e.target.checked
                            ? [...current, optIndex]
                            : current.filter((i: number) => i !== optIndex);
                          handleAnswerChange(question.id, {
                            selectedOptions: updated,
                          });
                        }}
                        className="h-4 w-4"
                      />
                      <span>{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === "TRUE_FALSE" && (
                <div className="space-y-2">
                  {["True", "False"].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 rounded border p-2 hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={answers[question.id]?.answerText === option}
                        onChange={() =>
                          handleAnswerChange(question.id, { answerText: option })
                        }
                        className="h-4 w-4"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {(question.type === "SHORT_ANSWER" || question.type === "FILL_BLANK") && (
                <textarea
                  value={answers[question.id]?.answerText || ""}
                  onChange={(e) =>
                    handleAnswerChange(question.id, { answerText: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  rows={3}
                  placeholder="Enter your answer..."
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button
            variant="secondary"
            onClick={() => {
              if (confirm("Are you sure you want to exit? Your progress will be lost.")) {
                setTakingTest(false);
                setAnswers({});
                setStartTime(null);
                setTimeRemaining(null);
              }
            }}
          >
            Exit Test
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(answers).length < test.questions.length}
          >
            {submitting ? "Submitting..." : "Submit Test"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

