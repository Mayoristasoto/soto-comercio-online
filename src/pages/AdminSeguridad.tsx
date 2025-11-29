import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileCheck, Lock, ScanFace } from "lucide-react";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { TwoFactorSetup } from "@/components/admin/TwoFactorAuth";
import { ComplianceReports } from "@/components/admin/ComplianceReports";
import { FacialRecognitionLogs } from "@/components/admin/FacialRecognitionLogs";

export default function AdminSeguridad() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Seguridad y Auditoría</h1>
          <p className="text-muted-foreground">
            Gestión de seguridad, logs de auditoría y reportes de cumplimiento
          </p>
        </div>
      </div>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="audit" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Auditoría
          </TabsTrigger>
          <TabsTrigger value="facial" className="gap-2">
            <ScanFace className="h-4 w-4" />
            Reconocimiento Facial
          </TabsTrigger>
          <TabsTrigger value="2fa" className="gap-2">
            <Lock className="h-4 w-4" />
            Autenticación 2FA
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <Shield className="h-4 w-4" />
            Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="facial" className="space-y-4">
          <FacialRecognitionLogs />
        </TabsContent>

        <TabsContent value="2fa" className="space-y-4">
          <TwoFactorSetup />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
