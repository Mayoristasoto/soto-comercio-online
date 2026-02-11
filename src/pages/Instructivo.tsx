import { EmpleadoInstructivo } from "@/components/employee/EmpleadoInstructivo";

const Instructivo = () => {
  return (
    <div className="container mx-auto py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Instructivo del Sistema</h1>
        <p className="text-muted-foreground">
          Guía interactiva paso a paso para aprender a usar todas las funciones del sistema
        </p>
      </div>
      <EmpleadoInstructivo />
    </div>
  );
};

export default Instructivo;
