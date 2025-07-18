import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, CheckCircle, XCircle, RefreshCw, Trophy, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: number;
  documentId: number;
  questions: Question[];
  createdAt: string;
}

interface QuizPageProps {
  documentId: string;
}

export default function QuizPage({ documentId }: QuizPageProps) {
  const [location, setLocation] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch document details
  const { data: document } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
  });

  // Fetch existing quiz
  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}/quiz`],
  });

  // Generate quiz mutation
  const generateQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to generate quiz");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/quiz`] });
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setShowResults(false);
      setQuizCompleted(false);
      toast({ title: "Quiz generated successfully!" });
    },
    onError: () => {
      toast({ 
        title: "Failed to generate quiz", 
        description: "Please ensure Ollama is running with the phi model",
        variant: "destructive" 
      });
    },
  });

  const goBack = () => {
    setLocation(`/documents/${documentId}`);
  };

  const handleGenerateQuiz = () => {
    generateQuizMutation.mutate();
  };

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
    setQuizCompleted(true);
    
    const correctAnswers = quiz.questions.filter((q: Question) => 
      userAnswers[q.id] === q.correctAnswer
    ).length;
    
    toast({ 
      title: `Quiz completed!`, 
      description: `You got ${correctAnswers} out of ${quiz.questions.length} questions correct.`
    });
  };

  const resetQuiz = () => {
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setQuizCompleted(false);
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    const correctAnswers = quiz.questions.filter((q: Question) => 
      userAnswers[q.id] === q.correctAnswer
    ).length;
    return Math.round((correctAnswers / quiz.questions.length) * 100);
  };

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const progress = quiz ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={goBack} size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Document
              </Button>
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-emerald-600" />
                <h1 className="text-xl font-bold text-neutral-800">Knowledge Quiz</h1>
              </div>
            </div>
            <div className="text-sm text-neutral-600">
              {document?.filename}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Generate Quiz Section */}
        {!quiz && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2 text-emerald-600" />
                Generate Knowledge Quiz
              </CardTitle>
              <CardDescription>
                Create an AI-powered quiz based on your document content using local Ollama phi model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={handleGenerateQuiz}
                  disabled={generateQuizMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {generateQuizMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4 mr-2" />
                  )}
                  Generate Quiz
                </Button>
              </div>
              
              {generateQuizMutation.isPending && (
                <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Generating quiz questions...</p>
                      <p className="text-xs text-emerald-600">AI is analyzing your document to create relevant questions</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quiz Content */}
        {quizLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-neutral-400 mx-auto mb-4 animate-spin" />
                <p className="text-neutral-500">Loading quiz...</p>
              </div>
            </CardContent>
          </Card>
        ) : quiz && !showResults ? (
          <div className="space-y-6">
            {/* Progress Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">
                    Question {currentQuestionIndex + 1} of {quiz.questions.length}
                  </span>
                  <span className="text-sm text-neutral-500">{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>

            {/* Current Question */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-neutral-800">
                  {currentQuestion?.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={userAnswers[currentQuestion?.id]?.toString() || ""} 
                  onValueChange={(value) => handleAnswerSelect(currentQuestion.id, parseInt(value))}
                  className="space-y-3"
                >
                  {currentQuestion?.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex items-center justify-between mt-6">
                  <Button 
                    variant="outline" 
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex space-x-2">
                    {currentQuestionIndex === quiz.questions.length - 1 ? (
                      <Button 
                        onClick={handleSubmitQuiz}
                        disabled={Object.keys(userAnswers).length !== quiz.questions.length}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        Submit Quiz
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleNextQuestion}
                        disabled={userAnswers[currentQuestion?.id] === undefined}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : showResults && quiz ? (
          <div className="space-y-6">
            {/* Results Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-600" />
                  Quiz Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className="text-4xl font-bold text-emerald-600 mb-2">
                    {calculateScore()}%
                  </div>
                  <p className="text-lg text-neutral-700 mb-4">
                    You scored {quiz.questions.filter((q: Question) => userAnswers[q.id] === q.correctAnswer).length} out of {quiz.questions.length} questions correctly
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button onClick={resetQuiz} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retake Quiz
                    </Button>
                    <Button onClick={handleGenerateQuiz} className="bg-emerald-600 hover:bg-emerald-700">
                      <Brain className="w-4 h-4 mr-2" />
                      Generate New Quiz
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results */}
            <div className="space-y-4">
              {quiz.questions.map((question: Question, index: number) => {
                const userAnswer = userAnswers[question.id];
                const isCorrect = userAnswer === question.correctAnswer;
                
                return (
                  <Card key={question.id} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 mr-2 text-red-600" />
                        )}
                        Question {index + 1}
                      </CardTitle>
                      <CardDescription>{question.question}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div 
                            key={optionIndex}
                            className={`p-2 rounded ${
                              optionIndex === question.correctAnswer 
                                ? 'bg-green-100 border border-green-300' 
                                : optionIndex === userAnswer && !isCorrect
                                ? 'bg-red-100 border border-red-300'
                                : 'bg-neutral-50'
                            }`}
                          >
                            {option}
                            {optionIndex === question.correctAnswer && (
                              <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                            )}
                            {optionIndex === userAnswer && !isCorrect && (
                              <span className="ml-2 text-red-600 font-medium">✗ Your Answer</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {question.explanation && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800">
                            <strong>Explanation:</strong> {question.explanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : quiz && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Target className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Ready to Test Your Knowledge?</h3>
                <p className="text-neutral-500 mb-6">
                  Your quiz is ready with {quiz.questions.length} questions based on the document content
                </p>
                <Button onClick={resetQuiz} className="bg-emerald-600 hover:bg-emerald-700">
                  <Brain className="w-4 h-4 mr-2" />
                  Start Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}