'use client';

import { useState } from 'react';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface QuizProps {
  questions: QuizQuestion[];
}

export default function Quiz({ questions }: QuizProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (questionIndex: number, answer: string) => {
    setSelectedAnswers({ ...selectedAnswers, [questionIndex]: answer });
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.answer) {
        correct++;
      }
    });
    return { correct, total: questions.length };
  };

  const score = showResults ? calculateScore() : null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 my-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Quiz</h2>
        {score && (
          <div className="text-lg font-semibold text-blue-600">
            Score: {score.correct}/{score.total}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {questions.map((question, qIndex) => {
          const selected = selectedAnswers[qIndex];
          const isCorrect = selected === question.answer;
          const showAnswer = showResults;

          return (
            <div key={qIndex} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Question {qIndex + 1}: {question.question}
              </h3>
              <div className="space-y-2">
                {question.options.map((option, oIndex) => {
                  const optionKey = String.fromCharCode(65 + oIndex); // A, B, C, D
                  const isSelected = selected === optionKey;
                  const isAnswer = optionKey === question.answer;

                  let bgColor = 'bg-white hover:bg-gray-50';
                  if (showAnswer) {
                    if (isAnswer) {
                      bgColor = 'bg-green-100 border-green-500';
                    } else if (isSelected && !isAnswer) {
                      bgColor = 'bg-red-100 border-red-500';
                    }
                  } else if (isSelected) {
                    bgColor = 'bg-blue-100 border-blue-500';
                  }

                  return (
                    <label
                      key={oIndex}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${bgColor}`}
                    >
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        value={optionKey}
                        checked={isSelected}
                        onChange={() => handleAnswer(qIndex, optionKey)}
                        disabled={showAnswer}
                        className="mr-3"
                      />
                      <span className="font-semibold mr-2">{optionKey}.</span>
                      <span>{option}</span>
                      {showAnswer && isAnswer && (
                        <span className="ml-auto text-green-600 font-semibold">✓ Correct</span>
                      )}
                      {showAnswer && isSelected && !isAnswer && (
                        <span className="ml-auto text-red-600 font-semibold">✗ Incorrect</span>
                      )}
                    </label>
                  );
                })}
              </div>
              {showAnswer && question.explanation && (
                <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                  <p className="text-sm text-gray-700">
                    <strong>Explanation:</strong> {question.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        {!showResults ? (
          <button
            onClick={() => {
              if (Object.keys(selectedAnswers).length === questions.length) {
                setShowResults(true);
              } else {
                alert('Please answer all questions before submitting.');
              }
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Submit Answers
          </button>
        ) : (
          <button
            onClick={() => {
              setShowResults(false);
              setSelectedAnswers({});
            }}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Retake Quiz
          </button>
        )}
      </div>
    </div>
  );
}


