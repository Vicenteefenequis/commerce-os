"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { scanTicket } from "./actions";

export type ScanOutcome = "authorized" | "already_used" | "invalid" | "wrong_venue" | "wrong_time" | "expired";

export interface VenueOption {
  id: string;
  name: string;
}

const OUTCOME_DISPLAY: Record<ScanOutcome, { label: string; symbol: string; className: string }> = {
  authorized: { label: "Autorizado", symbol: "✓", className: "border-success bg-success/15 text-success" },
  already_used: { label: "Já utilizado", symbol: "↻", className: "border-warning bg-warning/15 text-warning" },
  invalid: { label: "Código inválido", symbol: "✕", className: "border-danger bg-danger/15 text-danger" },
  wrong_venue: { label: "Local incorreto", symbol: "⌖", className: "border-danger bg-danger/15 text-danger" },
  wrong_time: { label: "Horário incorreto", symbol: "◷", className: "border-warning bg-warning/15 text-warning" },
  expired: { label: "Expirado", symbol: "⏱", className: "border-fg-muted bg-bg-subtle text-fg-muted" },
};

/**
 * Scan Client Component leaf (design.md D1/D2): the tight scan-and-see-result
 * loop, plus the Venue gate the spec requires before any scan is submitted.
 * Venue list is server-loaded (admin/data-fetching); everything below is
 * transient interaction state with no page-data representation.
 */
export function ScanContent({ venues }: { venues: VenueOption[] }) {
  const [venueId, setVenueId] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);

  async function submitCode(rawCode: string) {
    const trimmed = rawCode.trim();
    if (!venueId || !trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const result = await scanTicket({ code: trimmed, venueId });
    setIsSubmitting(false);
    // Ready for the next scan immediately: clear the code regardless of outcome.
    setCode("");

    if (result.error) {
      setError(result.error);
      setOutcome(null);
      return;
    }
    setOutcome(result.outcome ?? null);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitCode(code);
  }

  useEffect(() => {
    if (!cameraActive) {
      scannerRef.current?.destroy();
      scannerRef.current = null;
      return;
    }

    let cancelled = false;
    void (async () => {
      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !videoRef.current) return;
      const instance = new QrScanner(
        videoRef.current,
        (result) => {
          void submitCode(typeof result === "string" ? result : result.data);
        },
        { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true },
      );
      scannerRef.current = instance;
      await instance.start();
    })();

    return () => {
      cancelled = true;
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive]);

  const venueOptions = venues.map((venue) => ({ value: venue.id, label: venue.name }));
  const canScan = Boolean(venueId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Scanner de acesso</h1>
        <p className="mt-1 text-sm text-fg-muted">Selecione a unidade e escaneie ou digite o código do ingresso.</p>
      </div>

      <Card>
        <CardHeader title="Unidade" />
        <Select
          label="Unidade"
          options={venueOptions}
          value={venueId}
          onValueChange={(value) => {
            setVenueId(value);
            setOutcome(null);
            setError(null);
          }}
          placeholder="Selecione a unidade"
        />
      </Card>

      <Card>
        <CardHeader
          title="Ler código"
          description={canScan ? undefined : "Selecione uma unidade para habilitar o scanner."}
        />
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={cameraActive ? "secondary" : "primary"}
              disabled={!canScan}
              onClick={() => setCameraActive((active) => !active)}
            >
              {cameraActive ? "Parar câmera" : "Usar câmera"}
            </Button>
          </div>

          {cameraActive && (
            <video ref={videoRef} className="w-full max-w-sm rounded-md border border-border" muted playsInline />
          )}

          <form onSubmit={handleManualSubmit} className="flex items-end gap-3">
            <Input
              label="Código do ingresso"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={!canScan}
              placeholder="Digite o código"
            />
            <Button type="submit" disabled={!canScan || !code.trim()} isLoading={isSubmitting}>
              Validar
            </Button>
          </form>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-danger bg-danger/15 px-6 py-4 text-sm text-danger">{error}</div>
      )}

      {outcome && (
        <div
          className={`flex items-center gap-4 rounded-lg border-2 px-6 py-8 text-center ${OUTCOME_DISPLAY[outcome].className}`}
        >
          <span aria-hidden="true" className="text-3xl">
            {OUTCOME_DISPLAY[outcome].symbol}
          </span>
          <span className="text-2xl font-semibold">{OUTCOME_DISPLAY[outcome].label}</span>
        </div>
      )}
    </div>
  );
}
