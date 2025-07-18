import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Brain, CheckCircle, XCircle, RefreshCw, Trophy, Target, PenTool, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: number;
  question: string;
  type: 'mcq' | 'essay' | 'fill-blank' | 'short-answer';
  options?: string[]; // For MCQ
  correctAnswer?: number; // For MCQ
  sampleAnswer?: string; // For essay and short-answer
  blanks?: string[]; // For fill-in-the-blank
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
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: any }>({});
  const [showResults, setShowResults] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(['mcq']);
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(5);
  const [showQuestionSelection, setShowQuestionSelection] = useState(false);
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
        body: JSON.stringify({ 
          questionTypes: selectedQuestionTypes, 
          numberOfQuestions: numberOfQuestions 
        }),
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
      toast({ title: "Custom quiz generated successfully!" });
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
    if (selectedQuestionTypes.length === 0) {
      toast({
        title: "No question types selected",
        description: "Please select at least one question type.",
        variant: "destructive"
      });
      return;
    }
    generateQuizMutation.mutate();
  };

  const handleQuestionTypeToggle = (questionType: string) => {
    setSelectedQuestionTypes(prev => 
      prev.includes(questionType)
        ? prev.filter(type => type !== questionType)
        : [...prev, questionType]
    );
  };

  const handleAnswerSelect = (questionId: number, answer: any) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
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
            <CardContent className="space-y-6">
              {/* Quiz Configuration */}
              <div className="space-y-6">
                {/* Question Type Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Select Question Types</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { type: 'mcq', label: 'Multiple Choice Questions', icon: Brain, color: 'emerald' },
                      { type: 'essay', label: 'Essay Questions', icon: Edit3, color: 'purple' },
                      { type: 'short-answer', label: 'Short Answer', icon: PenTool, color: 'blue' },
                      { type: 'fill-blank', label: 'Fill in the Blanks', icon: Target, color: 'orange' }
                    ].map(({ type, label, icon: Icon, color }) => (
                      <div key={type} className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedQuestionTypes.includes(type) 
                          ? `border-${color}-300 bg-${color}-50` 
                          : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
                      }`} onClick={() => handleQuestionTypeToggle(type)}>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedQuestionTypes.includes(type)}
                            onChange={() => handleQuestionTypeToggle(type)}
                            className={`w-4 h-4 text-${color}-600 border-neutral-300 rounded focus:ring-${color}-500`}
                          />
                          <Icon className={`w-5 h-5 text-${color}-600`} />
                          <span className="font-medium text-neutral-800">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-neutral-600">
                    Selected: {selectedQuestionTypes.length > 0 ? selectedQuestionTypes.map(type => type.replace('-', ' ')).join(', ') : 'None'}
                  </div>
                </div>

                {/* Number of Questions */}
                <div className="space-y-2">
                  <Label htmlFor="num-questions">Total Number of Questions</Label>
                  <Select value={numberOfQuestions.toString()} onValueChange={(value) => setNumberOfQuestions(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Questions</SelectItem>
                      <SelectItem value="5">5 Questions</SelectItem>
                      <SelectItem value="7">7 Questions</SelectItem>
                      <SelectItem value="10">10 Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Question Type Descriptions */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="font-medium text-emerald-800 mb-2">How it works:</h4>
                <div className="text-sm text-emerald-700 space-y-1">
                  <p><strong>Multiple Choice:</strong> Pick the best answer from 4 options</p>
                  <p><strong>Essay:</strong> Write detailed explanations and analysis</p>
                  <p><strong>Short Answer:</strong> Brief responses to specific questions</p>
                  <p><strong>Fill in Blanks:</strong> Complete sentences with missing words</p>
                  <p><strong>Mix & Match:</strong> Select any combination of question types for your custom quiz</p>
                </div>
              </div>

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
                  Generate Custom Quiz ({selectedQuestionTypes.length} Type{selectedQuestionTypes.length !== 1 ? 's' : ''})
                </Button>
              </div>
              
              {generateQuizMutation.isPending && (
                <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Generating custom quiz questions...</p>
                      <p className="text-xs text-emerald-600">AI is creating {numberOfQuestions} questions with {selectedQuestionTypes.length} different type{selectedQuestionTypes.length !== 1 ? 's' : ''}</p>
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
                <CardTitle className="text-lg text-neutral-800 flex items-center">
                  {currentQuestion?.type === 'mcq' && <Brain className="w-5 h-5 mr-2 text-emerald-600" />}
                  {currentQuestion?.type === 'essay' && <Edit3 className="w-5 h-5 mr-2 text-purple-600" />}
                  {currentQuestion?.type === 'short-answer' && <PenTool className="w-5 h-5 mr-2 text-blue-600" />}
                  {currentQuestion?.type === 'fill-blank' && <Target className="w-5 h-5 mr-2 text-orange-600" />}
                  {currentQuestion?.question}
                </CardTitle>
                <CardDescription>
                  {currentQuestion?.type === 'mcq' && 'Select the best answer'}
                  {currentQuestion?.type === 'essay' && 'Write a detailed response'}
                  {currentQuestion?.type === 'short-answer' && 'Provide a brief answer'}
                  {currentQuestion?.type === 'fill-blank' && 'Fill in the missing words'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Multiple Choice Questions */}
                {currentQuestion?.type === 'mcq' && (
                  <RadioGroup 
                    value={userAnswers[currentQuestion?.id]?.toString() || ""} 
                    onValueChange={(value) => handleAnswerSelect(currentQuestion.id, parseInt(value))}
                    className="space-y-3"
                  >
                    {currentQuestion?.options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Essay Questions */}
                {currentQuestion?.type === 'essay' && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Write your detailed response here..."
                      value={userAnswers[currentQuestion?.id] || ""}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                      rows={8}
                      className="border-neutral-300 focus:border-purple-500"
                    />
                    <div className="text-sm text-neutral-500">
                      Tip: Include specific examples and explain your reasoning thoroughly.
                    </div>
                  </div>
                )}

                {/* Short Answer Questions */}
                {currentQuestion?.type === 'short-answer' && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Write your brief answer here..."
                      value={userAnswers[currentQuestion?.id] || ""}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                      rows={3}
                      className="border-neutral-300 focus:border-blue-500"
                    />
                    <div className="text-sm text-neutral-500">
                      Keep your answer concise but complete.
                    </div>
                  </div>
                )}

                {/* Fill in the Blanks */}
                {currentQuestion?.type === 'fill-blank' && (
                  <div className="space-y-3">
                    {currentQuestion?.blanks?.map((blank, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Label className="text-sm font-medium min-w-[80px]">
                          Blank {index + 1}:
                        </Label>
                        <Input
                          placeholder={`Enter word for blank ${index + 1}`}
                          value={userAnswers[currentQuestion?.id]?.[index] || ""}
                          onChange={(e) => {
                            const currentAnswers = userAnswers[currentQuestion?.id] || [];
                            const newAnswers = [...currentAnswers];
                            newAnswers[index] = e.target.value;
                            handleAnswerSelect(currentQuestion.id, newAnswers);
                          }}
                          className="border-neutral-300 focus:border-orange-500"
                        />
                      </div>
                    ))}
                    <div className="text-sm text-neutral-500">
                      Fill in each blank with the most appropriate word or phrase.
                    </div>
                  </div>
                )}

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