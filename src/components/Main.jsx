import { useState } from "react";
import { Container, Grid } from "@mantine/core";
import Result from "./Result";
import UserInputForm from "./UserInputForm";
import GitHubCorners from "@uiw/react-github-corners";
import { DEFAULTS, PRESETS, getActivePreset } from "../utils/presets";
import { validateUserInput } from "../utils/validation";
import {
  loadInput,
  saveInput,
  clearInput,
  loadExpandedFields,
  saveExpandedFields,
  consumeLegacyAdvanced,
  loadCustomPresets,
  saveCustomPresets,
  loadHiddenBuiltins,
  saveHiddenBuiltins,
  loadActivePresetId,
  saveActivePresetId,
  clearAll,
} from "../utils/storage";

const PERTURBED_FIELDS = [
  "rentIncreaseRate",
  "homePriceGrowthRate",
  "ownerCostGrowthRate",
  "annualMortgageInterestRate",
  "investmentReturnRate",
  "dividendYield",
];

const normalizeInput = (values) => ({ ...DEFAULTS, ...(values ?? {}) });

const Main = () => {
  const [userInput, setUserInput] = useState(() => {
    const loaded = loadInput();
    return loaded ? normalizeInput(loaded) : DEFAULTS;
  });
  const [expandedFields, setExpandedFieldsState] = useState(() => {
    const loaded = loadExpandedFields();
    if (loaded) return loaded;
    const legacy = consumeLegacyAdvanced();
    if (legacy) {
      saveExpandedFields(PERTURBED_FIELDS);
      return PERTURBED_FIELDS;
    }
    return [];
  });
  const [customPresets, setCustomPresets] = useState(
    () =>
      (loadCustomPresets() ?? []).map((preset) => ({
        ...preset,
        values: normalizeInput(preset.values),
      })),
  );
  const [hiddenBuiltins, setHiddenBuiltins] = useState(
    () => loadHiddenBuiltins() ?? [],
  );
  const [activePresetId, setActivePresetIdState] = useState(
    () => loadActivePresetId() ?? "defaults",
  );
  const errors = validateUserInput(userInput);

  const visibleBuiltins = PRESETS.filter((p) => !hiddenBuiltins.includes(p.id));
  const allPresets = [...visibleBuiltins, ...customPresets];

  // Highlight by explicit selection when valid; otherwise fall back to value match.
  let activePreset =
    allPresets.find((p) => p.id === activePresetId) ?? null;
  if (
    activePreset &&
    !Object.keys(activePreset.values).every(
      (k) => activePreset.values[k] === userInput[k],
    )
  ) {
    activePreset = null;
  }
  if (!activePreset) {
    activePreset = getActivePreset(userInput, allPresets);
  }

  function setActivePresetId(id) {
    setActivePresetIdState(id);
    saveActivePresetId(id);
  }

  function handleChange(inputIdentifier, newValue) {
    setUserInput((prev) => {
      const next = {
        ...prev,
        [inputIdentifier]: newValue ? +newValue : newValue,
      };
      saveInput(next);
      return next;
    });
    if (activePresetId !== null) setActivePresetId(null);
  }

  function handlePreset(preset) {
    setUserInput(normalizeInput(preset.values));
    clearInput();
    setActivePresetId(preset.id);
  }

  function toggleFieldExpanded(baseField) {
    setExpandedFieldsState((prev) => {
      const next = prev.includes(baseField)
        ? prev.filter((f) => f !== baseField)
        : [...prev, baseField];
      saveExpandedFields(next);
      return next;
    });
  }

  function handleSavePreset(name) {
    const label = name.trim();
    if (!label) return;
    const entry = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `cp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      values: userInput,
      custom: true,
    };
    const next = [...customPresets, entry];
    setCustomPresets(next);
    saveCustomPresets(next);
    setActivePresetId(entry.id);
  }

  function handleDeletePreset(preset) {
    if (preset.custom) {
      const next = customPresets.filter((p) => p.id !== preset.id);
      setCustomPresets(next);
      saveCustomPresets(next);
    } else {
      const next = [...hiddenBuiltins, preset.id];
      setHiddenBuiltins(next);
      saveHiddenBuiltins(next);
    }
    if (activePresetId === preset.id) setActivePresetId(null);
  }

  function handleReset() {
    clearAll();
    setUserInput(DEFAULTS);
    setExpandedFieldsState([]);
    setCustomPresets([]);
    setHiddenBuiltins([]);
    setActivePresetIdState("defaults");
  }

  return (
    <>
      <Container size="lg" py="md">
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <UserInputForm
              userInput={userInput}
              handleChange={handleChange}
              handlePreset={handlePreset}
              handleReset={handleReset}
              expandedFields={expandedFields}
              toggleFieldExpanded={toggleFieldExpanded}
              errors={errors}
              activePreset={activePreset}
              visibleBuiltins={visibleBuiltins}
              customPresets={customPresets}
              onSavePreset={handleSavePreset}
              onDeletePreset={handleDeletePreset}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Result
              userInput={userInput}
              errors={errors}
            />
          </Grid.Col>
        </Grid>
      </Container>
      <GitHubCorners
        position="left"
        href="https://github.com/low-earth-orbit/rent-vs-buy"
      />
    </>
  );
};

export default Main;
