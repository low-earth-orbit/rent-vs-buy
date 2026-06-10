import { useState } from "react";
import {
  Alert,
  Anchor,
  Collapse,
  FileInput,
  List,
  Stack,
  Text,
} from "@mantine/core";

type FileUploadProps = {
  file: File | null;
  error: string | null;
  onFileChange: (file: File | null) => void;
};

const FileUpload = ({ file, error, onFileChange }: FileUploadProps) => {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <Stack gap="xs">
      <FileInput
        label="Wealthsimple activity export (CSV)"
        description="Non-registered account activity export. Parsed entirely in your browser — nothing is uploaded."
        placeholder="Select CSV file"
        accept=".csv,text/csv"
        value={file}
        onChange={onFileChange}
        clearable
      />
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
          <List.Item>Upload the downloaded file here</List.Item>
        </List>
      </Collapse>
      {error && (
        <Alert color="red" title="Could not read file">
          <Text size="sm">{error}</Text>
        </Alert>
      )}
    </Stack>
  );
};

export default FileUpload;
