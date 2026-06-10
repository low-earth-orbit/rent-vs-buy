import { useState } from "react";
import { Anchor, Collapse, FileInput, List, Stack } from "@mantine/core";

type FileUploadProps = {
  files: File[];
  onFileChange: (files: File[]) => void;
};

const FileUpload = ({ files, onFileChange }: FileUploadProps) => {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <Stack gap="xs">
      <FileInput
        label="Wealthsimple activity export (CSV)"
        description="Non-registered account activity exports. Select one or more files covering distinct date ranges. Parsed entirely in your browser — nothing is uploaded."
        placeholder="Select CSV file(s)"
        accept=".csv,text/csv"
        multiple
        value={files}
        onChange={onFileChange}
        clearable
      />
      {files.length > 0 && (
        <List size="sm" c="dimmed" spacing={2}>
          {files.map((file) => (
            <List.Item key={file.name}>{file.name}</List.Item>
          ))}
        </List>
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
