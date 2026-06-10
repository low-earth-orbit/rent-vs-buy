import { useState } from "react";
import {
  Anchor,
  CloseButton,
  Collapse,
  FileInput,
  Group,
  List,
  Stack,
  Text,
} from "@mantine/core";

type FileUploadProps = {
  /** Names of files already uploaded and parsed. */
  fileNames: string[];
  /** Called with newly selected files; they ADD to the existing list. */
  onFilesAdded: (files: File[]) => void;
  /** Remove the file at the given index from the list. */
  onRemoveFile: (index: number) => void;
};

const FileUpload = ({
  fileNames,
  onFilesAdded,
  onRemoveFile,
}: FileUploadProps) => {
  const [showInstructions, setShowInstructions] = useState(false);
  // Remount the FileInput after each selection so it resets to empty and
  // selecting the same file again still fires onChange.
  const [inputKey, setInputKey] = useState(0);

  return (
    <Stack gap="xs">
      <FileInput
        key={inputKey}
        label="Wealthsimple activity export (CSV)"
        description="Non-registered account activity exports. Select one or more files covering distinct date ranges — each upload adds to the list below. Parsed entirely in your browser — nothing is uploaded."
        placeholder="Add CSV file(s)"
        accept=".csv,text/csv"
        multiple
        onChange={(selected) => {
          if (selected.length > 0) onFilesAdded(selected);
          setInputKey((key) => key + 1);
        }}
      />
      {fileNames.length > 0 && (
        <Stack gap={2}>
          {fileNames.map((name, index) => (
            <Group key={`${name}-${index}`} gap="xs" wrap="nowrap">
              <Text size="sm" c="dimmed">
                {name}
              </Text>
              <CloseButton
                size="sm"
                aria-label={`Remove ${name}`}
                onClick={() => onRemoveFile(index)}
              />
            </Group>
          ))}
        </Stack>
      )}
      <Anchor
        component="button"
        type="button"
        size="sm"
        c="dimmed"
        onClick={() => setShowInstructions((open) => !open)}
        aria-expanded={showInstructions}
      >
        {showInstructions ? "Hide" : "How to export from Wealthsimple"}
      </Anchor>
      <Collapse expanded={showInstructions}>
        <List type="ordered" size="sm" c="dimmed" spacing={4}>
          <List.Item>
            Log in to Wealthsimple and select your{" "}
            <strong>non-registered</strong> account
          </List.Item>
          <List.Item>
            Go to the <strong>Activity</strong> tab
          </List.Item>
          <List.Item>
            Click <strong>Download</strong> (top right) →{" "}
            <strong>Export as CSV</strong>
          </List.Item>
          <List.Item>Upload the downloaded file(s) here</List.Item>
        </List>
      </Collapse>
    </Stack>
  );
};

export default FileUpload;
