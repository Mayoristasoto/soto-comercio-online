import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BaseVacaciones, BASE_VACACIONES_LABEL } from "@/lib/vacacionesBase";

interface Props {
  value: BaseVacaciones;
  onChange: (v: BaseVacaciones) => void;
  className?: string;
  label?: string;
}

export function SelectorBaseVacaciones({ value, onChange, className, label = "Base de cálculo" }: Props) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as BaseVacaciones)}>
        <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ingreso">{BASE_VACACIONES_LABEL.ingreso}</SelectItem>
          <SelectItem value="reconocida">{BASE_VACACIONES_LABEL.reconocida}</SelectItem>
          <SelectItem value="prueba">{BASE_VACACIONES_LABEL.prueba}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
