import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

interface OutgoingFile {
  fileName: string;
  contents: string;
  mimeType: string;
  /** iOS Uniform Type Identifier matching `mimeType`. */
  uti: string;
  dialogTitle: string;
}

/**
 * Hands a file to the user: the system share sheet on iOS/Android (save to Files, email,
 * Drive, ...), a browser download on web. Throws if sharing is unavailable.
 */
export async function shareFile({
  fileName,
  contents,
  mimeType,
  uti,
  dialogTitle,
}: OutgoingFile): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle });
}

/** Lets the user pick a file and returns its text, or `null` if they cancel. */
export async function pickTextFile(mimeTypes: string[]): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = mimeTypes.join(',');
      input.onchange = () => {
        const picked = input.files?.[0];
        if (!picked) return resolve(null);
        picked.text().then(resolve, reject);
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // Android file managers often label .json files as octet-stream or text, so a strict
  // filter can hide the backup; contents are validated after picking instead.
  const picked = await File.pickFileAsync({
    mimeTypes: Platform.OS === 'ios' ? mimeTypes : ['*/*'],
  });
  if (picked.canceled) return null;
  return picked.result.text();
}
