import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  FileText, 
  Video, 
  Users, 
  BookOpen, 
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Sparkles,
  Loader2
} from "lucide-react";

interface Training {
  id: string;
  titulo: string;
  descripcion: string;
  duracion_estimada: number;
  obligatoria: boolean;
  activa: boolean;
  created_at: string;
}

interface TrainingMaterial {
  id: string;
  capacitacion_id: string;
  nombre: string;
  tipo: string;
  url: string;
  tamaño_archivo: number;
}

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface TrainingAssignment {
  id: string;
  capacitacion_id: string;
  empleado_id: string;
  estado: string;
  fecha_asignacion: string;
  fecha_completada: string;
  empleados: Employee;
  capacitaciones: Training;
}

interface Question {
  id: string;
  evaluacion_id: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  puntos: number;
  orden: number;
}

interface Evaluation {
  id: string;
  capacitacion_id: string;
  titulo: string;
  descripcion: string;
  puntaje_minimo: number;
  intentos_maximos: number;
  tiempo_limite: number;
  activa: boolean;
}

export default function TrainingManagement() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<string>("");
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  const [newTraining, setNewTraining] = useState({
    titulo: "",
    descripcion: "",
    duracion_estimada: 60,
    obligatoria: false,
    activa: true
  });

  const [newEvaluation, setNewEvaluation] = useState({
    titulo: "",
    descripcion: "",
    puntaje_minimo: 70,
    intentos_maximos: 3,
    tiempo_limite: 30,
    activa: true
  });

  const [newQuestion, setNewQuestion] = useState({
    pregunta: "",
    opciones: ["", "", "", ""],
    respuesta_correcta: 0,
    puntos: 1,
    orden: 0
  });

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showYoutubeDialog, setShowYoutubeDialog] = useState(false);
  const [selectedTrainingForYoutube, setSelectedTrainingForYoutube] = useState<string>("");

  // AI Question Generation
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiContent, setAiContent] = useState("");
  const [aiNumPreguntas, setAiNumPreguntas] = useState(5);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{
    pregunta: string;
    opciones: string[];
    respuesta_correcta: number;
  }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTrainings(),
        loadEmployees(),
        loadAssignments(),
        loadMaterials(),
        loadEvaluations(),
        loadQuestions()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const loadTrainings = async () => {
    const { data, error } = await supabase
      .from("capacitaciones")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setTrainings(data || []);
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("empleados")
      .select("id, nombre, apellido, email")
      .eq("activo", true);

    if (error) throw error;
    setEmployees(data || []);
  };

  const loadAssignments = async () => {
    const { data, error } = await supabase
      .from("asignaciones_capacitacion")
      .select(`
        *,
        empleados!empleado_id(id, nombre, apellido, email),
        capacitaciones!capacitacion_id(titulo)
      `)
      .order("fecha_asignacion", { ascending: false });

    if (error) throw error;
    setAssignments(data as any || []);
  };

  const loadMaterials = async () => {
    const { data, error } = await supabase
      .from("materiales_capacitacion")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setMaterials(data || []);
  };

  const loadEvaluations = async () => {
    const { data, error } = await supabase
      .from("evaluaciones_capacitacion")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setEvaluations(data || []);
  };

  const loadQuestions = async () => {
    const { data, error } = await supabase
      .from("preguntas_evaluacion")
      .select("*")
      .order("orden", { ascending: true });

    if (error) throw error;
    setQuestions((data || []).map(q => ({
      ...q,
      opciones: Array.isArray(q.opciones) ? q.opciones as string[] : []
    })));
  };

  const handleCreateTraining = async () => {
    try {
      const { error } = await supabase
        .from("capacitaciones")
        .insert([newTraining]);

      if (error) throw error;

      toast.success("Capacitación creada exitosamente");
      setShowTrainingDialog(false);
      setNewTraining({
        titulo: "",
        descripcion: "",
        duracion_estimada: 60,
        obligatoria: false,
        activa: true
      });
      loadTrainings();
    } catch (error) {
      console.error("Error creating training:", error);
      toast.error("Error al crear la capacitación");
    }
  };

  const handleUpdateTraining = async () => {
    if (!editingTraining) return;

    try {
      const { error } = await supabase
        .from("capacitaciones")
        .update(newTraining)
        .eq("id", editingTraining.id);

      if (error) throw error;

      toast.success("Capacitación actualizada exitosamente");
      setShowTrainingDialog(false);
      setEditingTraining(null);
      loadTrainings();
    } catch (error) {
      console.error("Error updating training:", error);
      toast.error("Error al actualizar la capacitación");
    }
  };

  const handleDeleteTraining = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta capacitación?")) return;

    try {
      const { error } = await supabase
        .from("capacitaciones")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Capacitación eliminada exitosamente");
      loadTrainings();
    } catch (error) {
      console.error("Error deleting training:", error);
      toast.error("Error al eliminar la capacitación");
    }
  };

  const handleFileUpload = async (file: File, trainingId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${trainingId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('training-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('training-materials')
        .getPublicUrl(filePath);

      const materialType = file.type.includes('video') ? 'video' : 
                          file.type.includes('pdf') ? 'pdf' : 'documento';

      const { error: dbError } = await supabase
        .from("materiales_capacitacion")
        .insert([{
          capacitacion_id: trainingId,
          nombre: file.name,
          tipo: materialType,
          url: publicUrl,
          tamaño_archivo: file.size
        }]);

      if (dbError) throw dbError;

      toast.success("Material subido exitosamente");
      loadMaterials();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el archivo");
    }
  };

  const handleAddYouTubeVideo = async () => {
    if (!selectedTrainingForYoutube || !youtubeUrl) return;

    try {
      // Extract video ID from YouTube URL
      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        toast.error("URL de YouTube inválida");
        return;
      }

      const { error } = await supabase
        .from("materiales_capacitacion")
        .insert([{
          capacitacion_id: selectedTrainingForYoutube,
          nombre: `Video de YouTube - ${videoId}`,
          tipo: 'youtube',
          url: youtubeUrl,
          tamaño_archivo: 0
        }]);

      if (error) throw error;

      toast.success("Video de YouTube agregado exitosamente");
      setShowYoutubeDialog(false);
      setYoutubeUrl("");
      setSelectedTrainingForYoutube("");
      loadMaterials();
    } catch (error) {
      console.error("Error adding YouTube video:", error);
      toast.error("Error al agregar el video de YouTube");
    }
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const getEmbedUrl = (url: string): string => {
    const videoId = extractYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  };

  const handleAssignTraining = async (trainingId: string, employeeIds: string[]) => {
    try {
      const assignments = employeeIds.map(employeeId => ({
        capacitacion_id: trainingId,
        empleado_id: employeeId,
        estado: 'pendiente'
      }));

      const { error } = await supabase
        .from("asignaciones_capacitacion")
        .insert(assignments);

      if (error) throw error;

      toast.success("Capacitación asignada exitosamente");
      setShowAssignDialog(false);
      loadAssignments();
    } catch (error) {
      console.error("Error assigning training:", error);
      toast.error("Error al asignar la capacitación");
    }
  };

  const handleCreateEvaluation = async () => {
    if (!selectedTraining) return;

    try {
      const { error } = await supabase
        .from("evaluaciones_capacitacion")
        .insert([{
          ...newEvaluation,
          capacitacion_id: selectedTraining
        }]);

      if (error) throw error;

      toast.success("Evaluación creada exitosamente");
      setShowEvaluationDialog(false);
      setNewEvaluation({
        titulo: "",
        descripcion: "",
        puntaje_minimo: 70,
        intentos_maximos: 3,
        tiempo_limite: 30,
        activa: true
      });
      loadEvaluations();
    } catch (error) {
      console.error("Error creating evaluation:", error);
      toast.error("Error al crear la evaluación");
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedEvaluation) return;

    try {
      const { error } = await supabase
        .from("preguntas_evaluacion")
        .insert([{
          ...newQuestion,
          evaluacion_id: selectedEvaluation.id
        }]);

      if (error) throw error;

      toast.success("Pregunta agregada exitosamente");
      setNewQuestion({
        pregunta: "",
        opciones: ["", "", "", ""],
        respuesta_correcta: 0,
        puntos: 1,
        orden: 0
      });
      loadQuestions();
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error("Error al agregar la pregunta");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completada':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Completada</Badge>;
      case 'en_progreso':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />En progreso</Badge>;
      case 'vencida':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" />Vencida</Badge>;
      default:
        return <Badge className="bg-muted/10 text-muted-foreground border-muted/20"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
    }
  };

  // Generate questions with AI
  const handleGenerateQuestionsAI = async () => {
    if (!selectedEvaluation || !aiContent.trim()) {
      toast.error("Ingresa el contenido de la capacitación");
      return;
    }

    setGeneratingQuestions(true);
    setGeneratedQuestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-training-questions', {
        body: {
          content: aiContent,
          titulo: selectedEvaluation.titulo,
          numPreguntas: aiNumPreguntas
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.preguntas && Array.isArray(data.preguntas)) {
        setGeneratedQuestions(data.preguntas);
        toast.success(`${data.preguntas.length} preguntas generadas con IA`);
      } else {
        toast.error("Formato de respuesta inválido");
      }
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast.error(error.message || "Error al generar preguntas");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Add generated question to evaluation
  const handleAddGeneratedQuestion = async (question: {
    pregunta: string;
    opciones: string[];
    respuesta_correcta: number;
  }) => {
    if (!selectedEvaluation) return;

    try {
      const { error } = await supabase
        .from("preguntas_evaluacion")
        .insert([{
          evaluacion_id: selectedEvaluation.id,
          pregunta: question.pregunta,
          opciones: question.opciones,
          respuesta_correcta: question.respuesta_correcta,
          puntos: 1,
          orden: questions.filter(q => q.evaluacion_id === selectedEvaluation.id).length + 1
        }]);

      if (error) throw error;

      toast.success("Pregunta agregada");
      setGeneratedQuestions(prev => prev.filter(q => q.pregunta !== question.pregunta));
      loadQuestions();
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error("Error al agregar la pregunta");
    }
  };

  // Add all generated questions
  const handleAddAllGeneratedQuestions = async () => {
    if (!selectedEvaluation || generatedQuestions.length === 0) return;

    try {
      const currentCount = questions.filter(q => q.evaluacion_id === selectedEvaluation.id).length;
      const questionsToInsert = generatedQuestions.map((q, index) => ({
        evaluacion_id: selectedEvaluation.id,
        pregunta: q.pregunta,
        opciones: q.opciones,
        respuesta_correcta: q.respuesta_correcta,
        puntos: 1,
        orden: currentCount + index + 1
      }));

      const { error } = await supabase
        .from("preguntas_evaluacion")
        .insert(questionsToInsert);

      if (error) throw error;

      toast.success(`${questionsToInsert.length} preguntas agregadas`);
      setGeneratedQuestions([]);
      setShowAIDialog(false);
      setAiContent("");
      loadQuestions();
    } catch (error) {
      console.error("Error adding questions:", error);
      toast.error("Error al agregar las preguntas");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Gestión de Capacitaciones</h2>
        <Dialog open={showTrainingDialog} onOpenChange={setShowTrainingDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTraining(null);
              setNewTraining({
                titulo: "",
                descripcion: "",
                duracion_estimada: 60,
                obligatoria: false,
                activa: true
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Capacitación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTraining ? "Editar Capacitación" : "Nueva Capacitación"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={newTraining.titulo}
                  onChange={(e) => setNewTraining({...newTraining, titulo: e.target.value})}
                  placeholder="Título de la capacitación"
                />
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={newTraining.descripcion}
                  onChange={(e) => setNewTraining({...newTraining, descripcion: e.target.value})}
                  placeholder="Descripción de la capacitación"
                />
              </div>
              <div>
                <Label htmlFor="duracion">Duración estimada (minutos)</Label>
                <Input
                  id="duracion"
                  type="number"
                  value={newTraining.duracion_estimada}
                  onChange={(e) => setNewTraining({...newTraining, duracion_estimada: parseInt(e.target.value)})}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="obligatoria"
                  checked={newTraining.obligatoria}
                  onCheckedChange={(checked) => setNewTraining({...newTraining, obligatoria: checked})}
                />
                <Label htmlFor="obligatoria">Capacitación obligatoria</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="activa"
                  checked={newTraining.activa}
                  onCheckedChange={(checked) => setNewTraining({...newTraining, activa: checked})}
                />
                <Label htmlFor="activa">Capacitación activa</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowTrainingDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={editingTraining ? handleUpdateTraining : handleCreateTraining}>
                  {editingTraining ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="trainings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trainings">Capacitaciones</TabsTrigger>
          <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="trainings" className="space-y-4">
          <div className="grid gap-4">
            {trainings.map((training) => (
              <Card key={training.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{training.titulo}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {training.obligatoria && (
                        <Badge variant="secondary">Obligatoria</Badge>
                      )}
                      {training.activa ? (
                        <Badge className="bg-success/10 text-success border-success/20">Activa</Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{training.descripcion}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {training.duracion_estimada} min
                      </span>
                      <span className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {materials.filter(m => m.capacitacion_id === training.id).length} materiales
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {assignments.filter(a => a.capacitacion_id === training.id).length} asignaciones
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        id={`file-${training.id}`}
                        className="hidden"
                        accept=".pdf,.mp4,.avi,.mov,.wmv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, training.id);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`file-${training.id}`)?.click()}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Subir Material
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTrainingForYoutube(training.id);
                          setShowYoutubeDialog(true);
                        }}
                      >
                        <Video className="w-4 h-4 mr-1" />
                        YouTube
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTraining(training.id);
                          setShowAssignDialog(true);
                        }}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Asignar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTraining(training);
                          setNewTraining({
                            titulo: training.titulo,
                            descripcion: training.descripcion || "",
                            duracion_estimada: training.duracion_estimada,
                            obligatoria: training.obligatoria,
                            activa: training.activa
                          });
                          setShowTrainingDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTraining(training.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {materials.filter(m => m.capacitacion_id === training.id).length > 0 && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                      <h4 className="font-medium mb-2">Materiales:</h4>
                      <div className="space-y-2">
                        {materials.filter(m => m.capacitacion_id === training.id).map((material) => (
                           <div key={material.id} className="space-y-2">
                             <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                               <div className="flex items-center">
                                 {material.tipo === 'pdf' ? (
                                   <FileText className="w-4 h-4 mr-2 text-destructive" />
                                 ) : material.tipo === 'youtube' ? (
                                   <Video className="w-4 h-4 mr-2 text-red-500" />
                                 ) : (
                                   <Video className="w-4 h-4 mr-2 text-primary" />
                                 )}
                                 <span className="text-sm">{material.nombre}</span>
                                 <Badge variant="outline" className="ml-2">{material.tipo}</Badge>
                                 {material.tipo === 'youtube' && (
                                   <a 
                                     href={material.url} 
                                     target="_blank" 
                                     rel="noopener noreferrer"
                                     className="ml-2 text-blue-500 hover:text-blue-700"
                                   >
                                     Ver video
                                   </a>
                                 )}
                               </div>
                               <span className="text-xs text-muted-foreground">
                                 {material.tipo === 'youtube' ? 'YouTube' : `${(material.tamaño_archivo / 1024 / 1024).toFixed(2)} MB`}
                               </span>
                             </div>
                             {material.tipo === 'youtube' && (
                               <div className="mt-2">
                                 <iframe
                                   width="100%"
                                   height="200"
                                   src={getEmbedUrl(material.url)}
                                   title={material.nombre}
                                   frameBorder="0"
                                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                   allowFullScreen
                                   className="rounded"
                                 ></iframe>
                               </div>
                             )}
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{assignment.capacitaciones?.titulo}</h3>
                      <p className="text-sm text-muted-foreground">
                        {assignment.empleados?.nombre} {assignment.empleados?.apellido} - {assignment.empleados?.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Asignada: {new Date(assignment.fecha_asignacion).toLocaleDateString()}
                        {assignment.fecha_completada && (
                          <span> • Completada: {new Date(assignment.fecha_completada).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                    {getStatusBadge(assignment.estado)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Dialog open={showEvaluationDialog} onOpenChange={setShowEvaluationDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Evaluación
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nueva Evaluación</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="training-select">Capacitación</Label>
                    <Select value={selectedTraining} onValueChange={setSelectedTraining}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar capacitación" />
                      </SelectTrigger>
                      <SelectContent>
                        {trainings.map((training) => (
                          <SelectItem key={training.id} value={training.id}>
                            {training.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="eval-titulo">Título de la evaluación</Label>
                    <Input
                      id="eval-titulo"
                      value={newEvaluation.titulo}
                      onChange={(e) => setNewEvaluation({...newEvaluation, titulo: e.target.value})}
                      placeholder="Título de la evaluación"
                    />
                  </div>
                  <div>
                    <Label htmlFor="eval-descripcion">Descripción</Label>
                    <Textarea
                      id="eval-descripcion"
                      value={newEvaluation.descripcion}
                      onChange={(e) => setNewEvaluation({...newEvaluation, descripcion: e.target.value})}
                      placeholder="Descripción de la evaluación"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="puntaje-min">Puntaje mínimo (%)</Label>
                      <Input
                        id="puntaje-min"
                        type="number"
                        value={newEvaluation.puntaje_minimo}
                        onChange={(e) => setNewEvaluation({...newEvaluation, puntaje_minimo: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="intentos-max">Intentos máximos</Label>
                      <Input
                        id="intentos-max"
                        type="number"
                        value={newEvaluation.intentos_maximos}
                        onChange={(e) => setNewEvaluation({...newEvaluation, intentos_maximos: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tiempo-limite">Tiempo límite (min)</Label>
                      <Input
                        id="tiempo-limite"
                        type="number"
                        value={newEvaluation.tiempo_limite}
                        onChange={(e) => setNewEvaluation({...newEvaluation, tiempo_limite: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowEvaluationDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateEvaluation}>
                      Crear Evaluación
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {evaluations.map((evaluation) => (
              <Card key={evaluation.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{evaluation.titulo}</CardTitle>
                    <Badge className={evaluation.activa ? "bg-success/10 text-success border-success/20" : "bg-muted/10 text-muted-foreground border-muted/20"}>
                      {evaluation.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{evaluation.descripcion}</p>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Puntaje mínimo:</span>
                      <p>{evaluation.puntaje_minimo}%</p>
                    </div>
                    <div>
                      <span className="font-medium">Intentos máximos:</span>
                      <p>{evaluation.intentos_maximos}</p>
                    </div>
                    <div>
                      <span className="font-medium">Tiempo límite:</span>
                      <p>{evaluation.tiempo_limite || "Sin límite"} min</p>
                    </div>
                    <div>
                      <span className="font-medium">Preguntas:</span>
                      <p>{questions.filter(q => q.evaluacion_id === evaluation.id).length}</p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedEvaluation(evaluation)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Preguntas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Capacitaciones</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trainings.length}</div>
                <p className="text-xs text-muted-foreground">
                  {trainings.filter(t => t.activa).length} activas
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Asignaciones Totales</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignments.length}</div>
                <p className="text-xs text-muted-foreground">
                  {assignments.filter(a => a.estado === 'completada').length} completadas
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Finalización</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assignments.length > 0 
                    ? Math.round((assignments.filter(a => a.estado === 'completada').length / assignments.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  de las asignaciones
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para asignar capacitación */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar Capacitación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Empleados</Label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`emp-${employee.id}`}
                      className="rounded"
                    />
                    <Label htmlFor={`emp-${employee.id}`} className="text-sm">
                      {employee.nombre} {employee.apellido}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                const checkedEmployees = Array.from(document.querySelectorAll('input[id^="emp-"]:checked'))
                  .map((input: any) => input.id.replace('emp-', ''));
                handleAssignTraining(selectedTraining, checkedEmployees);
              }}>
                Asignar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para agregar preguntas */}
      {selectedEvaluation && (
        <Dialog open={!!selectedEvaluation} onOpenChange={(open) => !open && setSelectedEvaluation(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Agregar Preguntas - {selectedEvaluation.titulo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pregunta">Pregunta</Label>
                  <Textarea
                    id="pregunta"
                    value={newQuestion.pregunta}
                    onChange={(e) => setNewQuestion({...newQuestion, pregunta: e.target.value})}
                    placeholder="Escribe la pregunta aquí"
                  />
                </div>
                <div>
                  <Label>Opciones de respuesta</Label>
                  <div className="space-y-2">
                    {newQuestion.opciones.map((opcion, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="respuesta_correcta"
                          checked={newQuestion.respuesta_correcta === index}
                          onChange={() => setNewQuestion({...newQuestion, respuesta_correcta: index})}
                        />
                        <Input
                          value={opcion}
                          onChange={(e) => {
                            const nuevasOpciones = [...newQuestion.opciones];
                            nuevasOpciones[index] = e.target.value;
                            setNewQuestion({...newQuestion, opciones: nuevasOpciones});
                          }}
                          placeholder={`Opción ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="puntos">Puntos</Label>
                    <Input
                      id="puntos"
                      type="number"
                      value={newQuestion.puntos}
                      onChange={(e) => setNewQuestion({...newQuestion, puntos: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="orden">Orden</Label>
                    <Input
                      id="orden"
                      type="number"
                      value={newQuestion.orden}
                      onChange={(e) => setNewQuestion({...newQuestion, orden: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddQuestion}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Pregunta
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAIDialog(true)}
                    className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generar con IA
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Preguntas existentes</h4>
                <div className="space-y-4">
                  {questions
                    .filter(q => q.evaluacion_id === selectedEvaluation.id)
                    .map((question, index) => (
                      <Card key={question.id}>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <h5 className="font-medium">
                              {index + 1}. {question.pregunta}
                            </h5>
                            <div className="space-y-1">
                              {question.opciones.map((opcion, opcionIndex) => (
                                <div
                                  key={opcionIndex}
                                  className={`text-sm p-2 rounded ${
                                    opcionIndex === question.respuesta_correcta
                                      ? 'bg-success/10 text-success border border-success/20'
                                      : 'bg-muted/30'
                                  }`}
                                >
                                  {String.fromCharCode(65 + opcionIndex)}. {opcion}
                                  {opcionIndex === question.respuesta_correcta && (
                                    <CheckCircle className="w-4 h-4 inline ml-2" />
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Puntos: {question.puntos} | Orden: {question.orden}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog para agregar video de YouTube */}
      <Dialog open={showYoutubeDialog} onOpenChange={setShowYoutubeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Video de YouTube</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="youtube-url">URL del video de YouTube</Label>
              <Input
                id="youtube-url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowYoutubeDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddYouTubeVideo}>
                Agregar Video
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para generar preguntas con IA */}
      <Dialog open={showAIDialog} onOpenChange={(open) => {
        setShowAIDialog(open);
        if (!open) {
          setAiContent("");
          setGeneratedQuestions([]);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generar Preguntas con IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="ai-content">
                  Pega aquí la transcripción o contenido del video/material
                </Label>
                <Textarea
                  id="ai-content"
                  value={aiContent}
                  onChange={(e) => setAiContent(e.target.value)}
                  placeholder="Pega aquí el contenido de la capacitación (transcripción del video, resumen del material, puntos clave, etc.)"
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: Puedes obtener la transcripción de YouTube usando extensiones del navegador o servicios como youtube-transcript.com
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32">
                  <Label htmlFor="num-preguntas">Cantidad</Label>
                  <Select
                    value={aiNumPreguntas.toString()}
                    onValueChange={(v) => setAiNumPreguntas(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7, 10].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} preguntas</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleGenerateQuestionsAI}
                  disabled={generatingQuestions || !aiContent.trim()}
                  className="mt-6"
                >
                  {generatingQuestions ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generar Preguntas
                    </>
                  )}
                </Button>
              </div>
            </div>

            {generatedQuestions.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Preguntas generadas ({generatedQuestions.length})</h4>
                    <Button onClick={handleAddAllGeneratedQuestions} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar todas
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {generatedQuestions.map((question, index) => (
                      <Card key={index} className="border-primary/20">
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-medium flex-1">
                                {index + 1}. {question.pregunta}
                              </h5>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleAddGeneratedQuestion(question)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Agregar
                              </Button>
                            </div>
                            <div className="space-y-1">
                              {question.opciones.map((opcion, opcionIndex) => (
                                <div
                                  key={opcionIndex}
                                  className={`text-sm p-2 rounded ${
                                    opcionIndex === question.respuesta_correcta
                                      ? 'bg-success/10 text-success border border-success/20'
                                      : 'bg-muted/30'
                                  }`}
                                >
                                  {String.fromCharCode(65 + opcionIndex)}. {opcion}
                                  {opcionIndex === question.respuesta_correcta && (
                                    <CheckCircle className="w-4 h-4 inline ml-2" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}