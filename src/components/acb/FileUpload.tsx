import { useState } from "react";
import {
  Button,
  CloseButton,
  FileInput,
  Group,
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
  /** Open the transaction preview for the file at the given index. */
  onPreview: (fileIndex: number) => void;
};

const FileUpload = ({
  fileNames,
  onFilesAdded,
  onRemoveFile,
  onPreview,
}: FileUploadProps) => {
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
              <Button
                variant="subtle"
                size="xs"
                onClick={() => onPreview(index)}
              >
                Preview
              </Button>
              <CloseButton
                size="sm"
                aria-label={`Remove ${name}`}
                onClick={() => onRemoveFile(index)}
              />
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default FileUpload;
