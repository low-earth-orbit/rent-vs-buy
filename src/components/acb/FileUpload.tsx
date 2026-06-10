import { Alert, FileInput, Stack, Text } from "@mantine/core";

type FileUploadProps = {
  file: File | null;
  error: string | null;
  onFileChange: (file: File | null) => void;
};

const FileUpload = ({ file, error, onFileChange }: FileUploadProps) => {
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
      {error && (
        <Alert color="red" title="Could not read file">
          <Text size="sm">{error}</Text>
        </Alert>
      )}
    </Stack>
  );
};

export default FileUpload;
