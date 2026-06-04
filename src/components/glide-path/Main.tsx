"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Container, Grid } from "@mantine/core";
import InputForm from "./InputForm";
import Result from "./Result";
import { DEFAULTS } from "@/utils/glide-path/presets";
import { loadInput, saveInput } from "@/utils/glide-path/storage";
import { validateGlidePathInput } from "@/utils/glide-path/validation";
import type {
  GlidePathInput,
  GlidePathInputKey,
  GlidePathResult,
  GlidePathResponse,
} from "@/utils/glide-path/types";
import type { FieldValue } from "@/types";

/** The result paired with the input snapshot it was computed for. */
interface Computed {
  data: GlidePathResult;
  input: GlidePathInput;
}

export default function Main() {
  const [input, setInput] = useState<GlidePathInput>(() => loadInput());
  const [computed, setComputed] = useState<Computed | null>(null);
  const [computing, setComputing] = useState(false);

  const errors = validateGlidePathInput(input);
  const hasErrors = Object.keys(errors).length > 0;

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../../workers/glidePathWorker.ts", import.meta.url),
    );
    workerRef.current.onmessage = (event: MessageEvent<GlidePathResponse>) => {
      const { requestId, result } = event.data;
      if (requestId === requestIdRef.current) {
        setComputed({ data: result, input: event.data.input });
        setComputing(false);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  const handleGenerate = useCallback(() => {
    if (!workerRef.current || hasErrors) return;
    requestIdRef.current += 1;
    setComputing(true);
    workerRef.current.postMessage({
      input,
      requestId: requestIdRef.current,
    });
  }, [input, hasErrors]);

  function handleChange(key: GlidePathInputKey, value: FieldValue) {
    setInput((prev) => {
      const next = {
        ...prev,
        [key]: value === "" ? value : +value,
      } as GlidePathInput;
      saveInput(next);
      return next;
    });
    // Clear stale results whenever inputs change so the panel stays honest.
    setComputed(null);
    setComputing(false);
    requestIdRef.current += 1; // invalidate any in-flight worker response
  }

  function handleReset() {
    const fresh: GlidePathInput = { ...DEFAULTS };
    setInput(fresh);
    saveInput(fresh);
    setComputed(null);
    setComputing(false);
    requestIdRef.current += 1;
  }

  return (
    <Container size="xl" pb="xl">
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, lg: 6 }} order={{ base: 2, lg: 1 }}>
          <InputForm
            input={input}
            errors={errors}
            onChange={handleChange}
            onReset={handleReset}
            onGenerate={handleGenerate}
            generating={computing}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 6 }} order={{ base: 1, lg: 2 }}>
          <Result
            input={computed?.input ?? input}
            result={computed?.data ?? null}
            computing={computing}
            hasErrors={hasErrors}
          />
        </Grid.Col>
      </Grid>
    </Container>
  );
}
