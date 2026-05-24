declare module 'archiver' {
  import { Transform } from 'stream';
  interface ArchiverOptions {
    zlib?: { level?: number };
  }
  interface EntryData {
    name?: string;
  }
  class Archiver extends Transform {
    constructor(options?: ArchiverOptions);
    file(filePath: string, data?: EntryData): this;
    finalize(): void;
  }
  class ZipArchive extends Archiver {}
  export { Archiver, ZipArchive, ArchiverOptions, EntryData };
}

declare module 'adm-zip' {
  interface AdmZipEntry {
    entryName: string;
    isDirectory: boolean;
    getData(): Buffer;
  }
  class AdmZip {
    constructor(buffer: Buffer);
    getEntries(): AdmZipEntry[];
    getEntry(entryName: string): AdmZipEntry | null;
    extractAllTo(target: string, overwrite?: boolean): void;
  }
  export default AdmZip;
}
