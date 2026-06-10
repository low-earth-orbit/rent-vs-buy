"use client";

import { useEffect, useRef, useState } from "react";
import { Container, Grid } from "@mantine/core";
import InputForm from "./InputForm";
import Result from "./Result";
import { DEFAULTS } from "@/utils/glide-path/presets";
import {
  loadInput,
  loadReturnMode,
  saveInput,
  saveReturnMode,
} from "@/utils/glide-path/storage";
import { validateGlidePathInput } from "@/utils/glide-path/validation";
import type {
  GlidePathInput,
  GlidePathInputKey,
  GlidePathResult,
  GlidePathResponse,
  GlidePathReturnMode,
} from "@/utils/glide-path/types";
import type { FieldValue } from "@/types";

/** The result paired with the input snapshot it was computed for. */
interface Computed {
  data: GlidePathResult;
  input: GlidePathInput;
}

export default function Main() {
  const [input, setInput] = useState<GlidePathInput>(() => loadInput());
  const [returnMode, setReturnMode] = useState<GlidePathReturnMode>(() =>
    loadReturnMode(),
  );
  const [computed, setComputed] = useState<Computed | null>(null);
  const [computing, setComputing] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [error, setError] = useState(false);
  const [seed, setSeed] = useState(0);

  const errors = validateGlidePathInput(input);
  const hasErrors = Object.keys(errors).length > 0;

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const seedRef = useRef(0);

  function terminateWorker() {
    workerRef.current?.terminate();
    workerRef.current = null;
  }

  useEffect(() => terminateWorker, []);

  function compute(seedValue: number, isReroll: boolean) {
    if (hasErrors) return;
    setError(false);
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    terminateWorker();

    const worker = new Worker(
      new URL("../../workers/glidePathWorker.ts", import.meta.url),
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<GlidePathResponse>) => {
      const { requestId: responseId, result } = event.data;
      if (responseId === requestIdRef.current) {
        setComputed({ data: result, input: event.data.input });
        setComputing(false);
        setRerolling(false);
      }
      if (workerRef.current === worker) terminateWorker();
    };
    worker.onerror = () => {
      if (requestId === requestIdRef.current) {
        setComputing(false);
        setRerolling(false);
        setComputed(null);
        setError(true);
      }
      if (workerRef.current === worker) terminateWorker();
    };

    // Re-roll keeps the current result visible (only the button spins); a fresh Generate
    // swaps to the full loader.
    if (isReroll) setRerolling(true);
    else setComputing(true);
    worker.postMessage({ input, requestId, seed: seedValue, returnMode });
  }

  function handleGenerate() {
    seedRef.current = 0;
    setSeed(0);
    compute(0, false);
  }

  // Opt-in: redraw the Monte Carlo with the next seed, leaving inputs untouched, so the user
  // can see how much the recommendation depends on simulation luck.
  function handleReroll() {
    const next = seedRef.current + 1;
    seedRef.current = next;
    setSeed(next);
    compute(next, true);
  }

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
    setRerolling(false);
    setError(false);
    seedRef.current = 0;
    setSeed(0);
    terminateWorker();
    requestIdRef.current += 1; // invalidate any in-flight worker response
  }

  function handleReturnModeChange(mode: GlidePathReturnMode) {
    setReturnMode(mode);
    saveReturnMode(mode);
    setComputed(null);
    setComputing(false);
    setRerolling(false);
    setError(false);
    seedRef.current = 0;
    setSeed(0);
    terminateWorker();
    requestIdRef.current += 1;
  }

  function handleReset() {
    const fresh: GlidePathInput = { ...DEFAULTS };
    setInput(fresh);
    saveInput(fresh);
    setComputed(null);
    setComputing(false);
    setRerolling(false);
    setError(false);
    seedRef.current = 0;
    setSeed(0);
    terminateWorker();
    requestIdRef.current += 1;
  }

  return (
    <Container size="xl" pb="xl">
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, lg: 6 }} order={{ base: 2, lg: 1 }}>
          <InputForm
            input={input}
            errors={errors}
            returnMode={returnMode}
            onChange={handleChange}
            onReturnModeChange={handleReturnModeChange}
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
            rerolling={rerolling}
            error={error}
            hasErrors={hasErrors}
            seed={seed}
            onReroll={handleReroll}
          />
        </Grid.Col>
      </Grid>
    </Container>
  );
}
