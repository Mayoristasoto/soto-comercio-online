import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Key, Smartphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function TwoFactorSetup() {
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const setupTwoFactor = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setStep('verify');
      }
    } catch (error: any) {
      console.error('Error configurando 2FA:', error);
      toast.error(error.message || 'Error al configurar autenticación de dos factores');
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFactor = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;

      const totpFactor = factors.data?.totp?.[0];
      if (!totpFactor) throw new Error('Factor TOTP no encontrado');

      // First challenge to get the challenge ID
      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challenge.error) throw challenge.error;

      // Then verify with the challenge ID
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code: verificationCode,
      });

      if (error) throw error;

      setStep('complete');
      toast.success('Autenticación de dos factores activada correctamente');
    } catch (error: any) {
      console.error('Error verificando 2FA:', error);
      toast.error(error.message || 'Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    setLoading(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;

      const totpFactor = factors.data?.totp?.[0];
      if (!totpFactor) throw new Error('Factor TOTP no encontrado');

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id,
      });

      if (error) throw error;

      setStep('setup');
      setQrCode('');
      setSecret('');
      setVerificationCode('');
      toast.success('Autenticación de dos factores desactivada');
    } catch (error: any) {
      console.error('Error desactivando 2FA:', error);
      toast.error(error.message || 'Error al desactivar 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Autenticación de Dos Factores (2FA)</CardTitle>
        </div>
        <CardDescription>
          Agrega una capa adicional de seguridad a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'setup' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
              <Key className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">¿Qué es 2FA?</p>
                <p className="text-sm text-muted-foreground">
                  La autenticación de dos factores requiere un código adicional de tu teléfono
                  cada vez que inicies sesión, haciendo tu cuenta más segura.
                </p>
              </div>
            </div>
            <Button onClick={setupTwoFactor} disabled={loading} className="w-full gap-2">
              <Smartphone className="h-4 w-4" />
              Activar 2FA
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-4 border rounded-lg">
              <p className="text-sm font-medium">1. Escanea este código QR</p>
              {qrCode && (
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              )}
              <p className="text-xs text-muted-foreground text-center">
                Usa Google Authenticator, Authy o similar
              </p>
              {secret && (
                <div className="space-y-2 w-full">
                  <Label className="text-xs">O ingresa este código manualmente:</Label>
                  <Input value={secret} readOnly className="text-center font-mono text-sm" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>2. Ingresa el código de 6 dígitos</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button
              onClick={verifyTwoFactor}
              disabled={loading || verificationCode.length !== 6}
              className="w-full"
            >
              Verificar y Activar
            </Button>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-500/5 border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-700">2FA Activado</p>
                <p className="text-sm text-muted-foreground">
                  Tu cuenta ahora está protegida con autenticación de dos factores.
                  Necesitarás tu código cada vez que inicies sesión.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={disableTwoFactor}
              disabled={loading}
              className="w-full"
            >
              Desactivar 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
