"use client";

import { useEffect, useRef, useState } from "react";
import { Container, Grid } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
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

  const errors = validateGlidePathInput(input);
  const hasErrors = Object.keys(errors).length > 0;

  // The optimization is seconds of CPU, so debounce generously and run it in a worker.
  const [debouncedInput] = useDebouncedValue(input, 400);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const requestInputRef = useRef<GlidePathInput | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../../workers/glidePathWorker.ts", import.meta.url),
    );
    workerRef.current.onmessage = (event: MessageEvent<GlidePathResponse>) => {
      const { requestId, result } = event.data;
      // Drop stale responses; tag the result with the input it was computed for.
      if (requestId === requestIdRef.current && requestInputRef.current) {
        setComputed({ data: result, input: requestInputRef.current });
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    // Invalid input: skip the run (Result shows the error alert instead).
    if (Object.keys(validateGlidePathInput(debouncedInput)).length > 0) return;
    requestIdRef.current += 1;
    requestInputRef.current = debouncedInput; // ref write (not setState) — safe in an effect
    workerRef.current.postMessage({
      input: debouncedInput,
      requestId: requestIdRef.current,
    });
  }, [debouncedInput]);

  // Derived (no effect setState): a fresh run is in flight whenever the current
  // result wasn't computed for the latest debounced input.
  const computing = !hasErrors && computed?.input !== debouncedInput;

  function handleChange(key: GlidePathInputKey, value: FieldValue) {
    setInput((prev) => {
      const next = {
        ...prev,
        [key]: value === "" ? value : +value,
      } as GlidePathInput;
      saveInput(next);
      return next;
    });
  }

  function handleReset() {
    const fresh: GlidePathInput = { ...DEFAULTS };
    setInput(fresh);
    saveInput(fresh);
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
