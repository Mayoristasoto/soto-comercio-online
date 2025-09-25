import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Award, Clock, CheckCircle, XCircle } from "lucide-react";

interface Question {
  id: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  puntos: number;
  orden: number;
}

interface Evaluation {
  id: string;
  titulo: string;
  descripcion: string;
  puntaje_minimo: number;
  intentos_maximos: number;
  tiempo_limite: number;
}

interface Props {
  evaluation: Evaluation | null;
  empleadoId: string;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function EvaluationModal({ evaluation, empleadoId, open, onClose, onComplete }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (evaluation && open) {
      loadQuestions();
      if (evaluation.tiempo_limite) {
        setTimeLeft(evaluation.tiempo_limite * 60); // Convert minutes to seconds
      }
    }
  }, [evaluation, open]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isFinished) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isFinished) {
      handleSubmitEvaluation();
    }
  }, [timeLeft, isFinished]);

  const loadQuestions = async () => {
    if (!evaluation) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('preguntas_evaluacion')
        .select('*')
        .eq('evaluacion_id', evaluation.id)
        .order('orden');

      if (error) throw error;

      setQuestions((data || []).map(q => ({
        ...q,
        opciones: Array.isArray(q.opciones) ? q.opciones as string[] : []
      })));
      setCurrentQuestionIndex(0);
      setAnswers({});
      setIsFinished(false);
      setResult(null);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: "Error",
        description: "Error al cargar las preguntas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmitEvaluation = async () => {
    if (!evaluation) return;

    setLoading(true);
    try {
      // Calculate score
      let correctAnswers = 0;
      let totalPoints = 0;
      const responses: { [key: string]: number } = {};

      questions.forEach(question => {
        const userAnswer = answers[question.id];
        responses[question.id] = userAnswer ?? -1;
        totalPoints += question.puntos;
        
        if (userAnswer === question.respuesta_correcta) {
          correctAnswers += question.puntos;
        }
      });

      const percentage = totalPoints > 0 ? Math.round((correctAnswers / totalPoints) * 100) : 0;
      const passed = percentage >= evaluation.puntaje_minimo;

      // Save attempt to database
      const { error } = await supabase
        .from('intentos_evaluacion')
        .insert({
          evaluacion_id: evaluation.id,
          empleado_id: empleadoId,
          respuestas: responses,
          puntaje_obtenido: correctAnswers,
          puntaje_total: totalPoints,
          porcentaje: percentage,
          aprobado: passed,
          tiempo_empleado: evaluation.tiempo_limite ? (evaluation.tiempo_limite * 60) - (timeLeft || 0) : null,
          fecha_finalizacion: new Date().toISOString()
        });

      if (error) throw error;

      setResult({ score: percentage, passed });
      setIsFinished(true);

      if (passed) {
        toast({
          title: "¡Felicitaciones!",
          description: `Has aprobado la evaluación con ${percentage}%`,
        });
      } else {
        toast({
          title: "Evaluación no aprobada",
          description: `Obtuviste ${percentage}%. Necesitas ${evaluation.puntaje_minimo}% para aprobar.`,
          variant: "destructive"
        });
      }

      onComplete();
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast({
        title: "Error",
        description: "Error al enviar la evaluación",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  if (!evaluation) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {evaluation.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          {/* Timer and Progress */}
          {!isFinished && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Progress value={progress} className="w-40" />
                <span className="text-sm text-muted-foreground">
                  {currentQuestionIndex + 1} de {questions.length}
                </span>
              </div>
              {timeLeft !== null && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className={`text-sm ${timeLeft < 300 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p>Cargando evaluación...</p>
            </div>
          ) : isFinished && result ? (
            /* Results */
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex justify-center">
                  {result.passed ? (
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  ) : (
                    <XCircle className="h-16 w-16 text-red-500" />
                  )}
                </div>
                <h3 className="text-xl font-semibold">
                  {result.passed ? "¡Evaluación Aprobada!" : "Evaluación No Aprobada"}
                </h3>
                <p className="text-2xl font-bold">
                  {result.score}%
                </p>
                <p className="text-muted-foreground">
                  {result.passed 
                    ? `Has superado el puntaje mínimo de ${evaluation.puntaje_minimo}%`
                    : `Necesitas ${evaluation.puntaje_minimo}% para aprobar`
                  }
                </p>
                <Button onClick={onClose}>
                  Cerrar
                </Button>
              </CardContent>
            </Card>
          ) : currentQuestion ? (
            /* Question */
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-medium">
                  {currentQuestion.pregunta}
                </h3>
                
                <RadioGroup
                  value={answers[currentQuestion.id]?.toString() || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, parseInt(value))}
                >
                  {currentQuestion.opciones.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex justify-between items-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    Anterior
                  </Button>

                  <Badge variant="outline">
                    {currentQuestion.puntos} punto{currentQuestion.puntos !== 1 ? 's' : ''}
                  </Badge>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                      disabled={answers[currentQuestion.id] === undefined}
                    >
                      Siguiente
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitEvaluation}
                      disabled={answers[currentQuestion.id] === undefined || loading}
                    >
                      Finalizar Evaluación
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay preguntas disponibles para esta evaluación</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}