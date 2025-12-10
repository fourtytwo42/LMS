"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";

interface Question {
  id: string;
  type: string;
  questionText: string;
  points: number;
  options?: Array<{ text: string; correct: boolean }>;
  correctAnswer?: string;
  explanation?: string;
  order: number;
}

interface Test {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number | null;
  timeLimit: number | null;
  showCorrectAnswers: boolean;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
}

export default function TestEditPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const contentItemId = params.contentItemId as string;
  const { user } = useAuthStore();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isInstructor = user?.roles?.includes("INSTRUCTOR") || false;

  useEffect(() => {
    const fetchTest = async () => {
      try {
        // Check if test exists
        const testResponse = await fetch(`/api/tests/${contentItemId}`);
        if (testResponse.ok) {
          const testData = await testResponse.json();
          setTest(testData);

          // Fetch questions
          const questionsResponse = await fetch(`/api/tests/${contentItemId}/questions`);
          if (questionsResponse.ok) {
            const questionsData = await questionsResponse.json();
            setQuestions(questionsData.questions);
          }
        }
      } catch (error) {
        console.error("Error fetching test:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [contentItemId]);

  const handleSaveTest = async (formData: FormData) => {
    if (!test) {
      // Create new test
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentItemId,
          title: formData.get("title"),
          description: formData.get("description"),
          passingScore: parseFloat(formData.get("passingScore") as string),
          maxAttempts: formData.get("maxAttempts")
            ? parseInt(formData.get("maxAttempts") as string)
            : null,
          timeLimit: formData.get("timeLimit")
            ? parseInt(formData.get("timeLimit") as string)
            : null,
          showCorrectAnswers: formData.get("showCorrectAnswers") === "on",
          randomizeQuestions: formData.get("randomizeQuestions") === "on",
          randomizeAnswers: formData.get("randomizeAnswers") === "on",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTest(data.test);
      }
    } else {
      // Update existing test
      const response = await fetch(`/api/tests/${test.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          passingScore: parseFloat(formData.get("passingScore") as string),
          maxAttempts: formData.get("maxAttempts")
            ? parseInt(formData.get("maxAttempts") as string)
            : null,
          timeLimit: formData.get("timeLimit")
            ? parseInt(formData.get("timeLimit") as string)
            : null,
          showCorrectAnswers: formData.get("showCorrectAnswers") === "on",
          randomizeQuestions: formData.get("randomizeQuestions") === "on",
          randomizeAnswers: formData.get("randomizeAnswers") === "on",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTest({ ...test, ...data.test });
      }
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setQuestions(questions.filter((q) => q.id !== questionId));
      }
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  if (!isAdmin && !isInstructor) {
    router.replace(`/courses/${courseId}`);
    return null;
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

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
        <h1 className="mb-6 text-3xl font-bold">
          {test ? "Edit Test" : "Create Test"}
        </h1>

        <form
          action={handleSaveTest}
          className="space-y-6"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <Input
              name="title"
              defaultValue={test?.title || ""}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              name="description"
              defaultValue={test?.description || ""}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Passing Score (0-1)
              </label>
              <Input
                type="number"
                name="passingScore"
                step="0.01"
                min="0"
                max="1"
                defaultValue={test?.passingScore || 0.7}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Max Attempts
              </label>
              <Input
                type="number"
                name="maxAttempts"
                min="1"
                defaultValue={test?.maxAttempts || ""}
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Time Limit (minutes)
              </label>
              <Input
                type="number"
                name="timeLimit"
                min="1"
                defaultValue={test?.timeLimit || ""}
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="showCorrectAnswers"
                defaultChecked={test?.showCorrectAnswers || false}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Show Correct Answers After Submission</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="randomizeQuestions"
                defaultChecked={test?.randomizeQuestions || false}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Randomize Question Order</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="randomizeAnswers"
                defaultChecked={test?.randomizeAnswers || false}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Randomize Answer Order</span>
            </label>
          </div>

          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : test ? "Update Test" : "Create Test"}
          </Button>
        </form>

        {test && (
          <>
            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Questions</h2>
              <Button
                onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionModal(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {questions.length === 0 ? (
                <p className="text-center text-gray-500">No questions yet</p>
              ) : (
                questions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="font-semibold">
                            Question {index + 1}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({question.type}) - {question.points} points
                          </span>
                        </div>
                        <p>{question.questionText}</p>
                        {question.options && (
                          <div className="mt-2 space-y-1">
                            {question.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`text-sm ${
                                  opt.correct ? "text-green-600 font-semibold" : ""
                                }`}
                              >
                                {opt.correct && "✓ "}
                                {opt.text}
                              </div>
                            ))}
                          </div>
                        )}
                        {question.correctAnswer && (
                          <div className="mt-2 text-sm text-green-600">
                            Correct Answer: {question.correctAnswer}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingQuestion(question);
                            setShowQuestionModal(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </Card>

      {showQuestionModal && (
        <QuestionModal
          testId={test?.id || contentItemId}
          question={editingQuestion}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
          onSave={async () => {
            // Refresh questions
            const response = await fetch(`/api/tests/${contentItemId}/questions`);
            if (response.ok) {
              const data = await response.json();
              setQuestions(data.questions);
            }
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
}

function QuestionModal({
  testId,
  question,
  onClose,
  onSave,
}: {
  testId: string;
  question: Question | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [questionType, setQuestionType] = useState(question?.type || "SINGLE_CHOICE");
  const [questionText, setQuestionText] = useState(question?.questionText || "");
  const [points, setPoints] = useState(question?.points || 10);
  const [options, setOptions] = useState<
    Array<{ text: string; correct: boolean }>
  >(question?.options || [{ text: "", correct: false }]);
  const [correctAnswer, setCorrectAnswer] = useState(question?.correctAnswer || "");
  const [explanation, setExplanation] = useState(question?.explanation || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        type: questionType,
        questionText,
        points,
        explanation: explanation || null,
      };

      if (questionType === "SINGLE_CHOICE" || questionType === "MULTIPLE_CHOICE") {
        payload.options = options;
      } else {
        payload.correctAnswer = correctAnswer;
      }

      const url = question
        ? `/api/questions/${question.id}`
        : `/api/tests/${testId}/questions`;
      const method = question ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save question");

      onSave();
    } catch (error) {
      console.error("Error saving question:", error);
      alert("Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={question ? "Edit Question" : "Add Question"}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Question Type</label>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            disabled={!!question}
          >
            <option value="SINGLE_CHOICE">Single Choice</option>
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="TRUE_FALSE">True/False</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="FILL_BLANK">Fill in the Blank</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Question Text *</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            rows={3}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Points</label>
          <Input
            type="number"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
            min="1"
          />
        </div>

        {(questionType === "SINGLE_CHOICE" || questionType === "MULTIPLE_CHOICE") && (
          <div>
            <label className="mb-1 block text-sm font-medium">Options</label>
            {options.map((option, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <Input
                  value={option.text}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index].text = e.target.value;
                    setOptions(newOptions);
                  }}
                  placeholder="Option text"
                />
                <label className="flex items-center gap-2">
                  <input
                    type={questionType === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                    checked={option.correct}
                    onChange={(e) => {
                      const newOptions = [...options];
                      if (questionType === "SINGLE_CHOICE") {
                        newOptions.forEach((opt, idx) => {
                          opt.correct = idx === index;
                        });
                      } else {
                        newOptions[index].correct = e.target.checked;
                      }
                      setOptions(newOptions);
                    }}
                  />
                  <span className="text-sm">Correct</span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOptions(options.filter((_, i) => i !== index));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOptions([...options, { text: "", correct: false }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </div>
        )}

        {(questionType === "SHORT_ANSWER" || questionType === "FILL_BLANK") && (
          <div>
            <label className="mb-1 block text-sm font-medium">Correct Answer *</label>
            <Input
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              required
            />
          </div>
        )}

        {questionType === "TRUE_FALSE" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Correct Answer</label>
            <select
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            >
              <option value="">Select...</option>
              <option value="True">True</option>
              <option value="False">False</option>
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Explanation (optional)</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            rows={2}
            placeholder="Explanation shown after submission"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Question"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

