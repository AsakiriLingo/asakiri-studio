use std::fs::{self, File};
use std::io::{BufWriter, Write};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::course::resolve_course_path;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZipInput {
    pub name: String,
    pub source_relative_path: String,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WrittenEntry {
    pub name: String,
    pub offset: u64,
    pub length: u64,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WrittenZip {
    pub sha256: String,
    pub byte_size: u64,
    pub entries: Vec<WrittenEntry>,
}

fn crc32(bytes: &[u8]) -> u32 {
    let mut table = [0u32; 256];
    let mut index = 0;
    while index < 256 {
        let mut value = index as u32;
        let mut bit = 0;
        while bit < 8 {
            value = if value & 1 == 1 {
                0xedb88320 ^ (value >> 1)
            } else {
                value >> 1
            };
            bit += 1;
        }
        table[index] = value;
        index += 1;
    }
    let mut crc = 0xffffffffu32;
    for &byte in bytes {
        crc = table[((crc ^ byte as u32) & 0xff) as usize] ^ (crc >> 8);
    }
    crc ^ 0xffffffff
}

struct HashingWriter<W: Write> {
    inner: W,
    hasher: Sha256,
    count: u64,
}

impl<W: Write> HashingWriter<W> {
    fn new(inner: W) -> Self {
        HashingWriter {
            inner,
            hasher: Sha256::new(),
            count: 0,
        }
    }

    fn put(&mut self, bytes: &[u8]) -> Result<(), String> {
        self.inner.write_all(bytes).map_err(|_| "unknown".to_string())?;
        self.hasher.update(bytes);
        self.count += bytes.len() as u64;
        Ok(())
    }
}

struct CentralRecord {
    name: Vec<u8>,
    crc: u32,
    size: u32,
    local_header_offset: u32,
}

const DOS_DATE: u16 = 0x0021;

fn write_local_header(
    writer: &mut HashingWriter<BufWriter<File>>,
    name: &[u8],
    crc: u32,
    size: u32,
) -> Result<(), String> {
    writer.put(&0x04034b50u32.to_le_bytes())?;
    writer.put(&20u16.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&DOS_DATE.to_le_bytes())?;
    writer.put(&crc.to_le_bytes())?;
    writer.put(&size.to_le_bytes())?;
    writer.put(&size.to_le_bytes())?;
    writer.put(&(name.len() as u16).to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(name)?;
    Ok(())
}

fn write_central_header(
    writer: &mut HashingWriter<BufWriter<File>>,
    record: &CentralRecord,
) -> Result<(), String> {
    writer.put(&0x02014b50u32.to_le_bytes())?;
    writer.put(&20u16.to_le_bytes())?;
    writer.put(&20u16.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&DOS_DATE.to_le_bytes())?;
    writer.put(&record.crc.to_le_bytes())?;
    writer.put(&record.size.to_le_bytes())?;
    writer.put(&record.size.to_le_bytes())?;
    writer.put(&(record.name.len() as u16).to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&0u32.to_le_bytes())?;
    writer.put(&record.local_header_offset.to_le_bytes())?;
    writer.put(&record.name)?;
    Ok(())
}

fn write_end_record(
    writer: &mut HashingWriter<BufWriter<File>>,
    entry_count: u16,
    central_offset: u32,
    central_size: u32,
) -> Result<(), String> {
    writer.put(&0x06054b50u32.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    writer.put(&entry_count.to_le_bytes())?;
    writer.put(&entry_count.to_le_bytes())?;
    writer.put(&central_size.to_le_bytes())?;
    writer.put(&central_offset.to_le_bytes())?;
    writer.put(&0u16.to_le_bytes())?;
    Ok(())
}

fn as_u32(value: u64) -> Result<u32, String> {
    u32::try_from(value).map_err(|_| "tooLarge".to_string())
}

#[tauri::command]
pub fn write_stored_zip(
    root_path: String,
    output_relative_path: String,
    entries: Vec<ZipInput>,
) -> Result<WrittenZip, String> {
    let output =
        resolve_course_path(&root_path, &output_relative_path).ok_or_else(|| "invalidPath".to_string())?;

    if entries.len() > u16::MAX as usize {
        return Err("tooManyEntries".to_string());
    }

    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent).map_err(|_| "unknown".to_string())?;
    }

    let file = File::create(&output).map_err(|_| "unknown".to_string())?;
    let mut writer = HashingWriter::new(BufWriter::new(file));

    let mut central = Vec::with_capacity(entries.len());
    let mut written = Vec::with_capacity(entries.len());

    for entry in &entries {
        let source =
            resolve_course_path(&root_path, &entry.source_relative_path).ok_or_else(|| "invalidPath".to_string())?;
        let bytes = fs::read(&source).map_err(|error| match error.kind() {
            std::io::ErrorKind::NotFound => "notFound".to_string(),
            _ => "unknown".to_string(),
        })?;

        let name = entry.name.as_bytes().to_vec();
        let crc = crc32(&bytes);
        let size = as_u32(bytes.len() as u64)?;
        let local_header_offset = as_u32(writer.count)?;

        write_local_header(&mut writer, &name, crc, size)?;
        let data_offset = writer.count;
        writer.put(&bytes)?;

        central.push(CentralRecord {
            name,
            crc,
            size,
            local_header_offset,
        });
        written.push(WrittenEntry {
            name: entry.name.clone(),
            offset: data_offset,
            length: bytes.len() as u64,
        });
    }

    let central_offset = as_u32(writer.count)?;
    for record in &central {
        write_central_header(&mut writer, record)?;
    }
    let central_size = as_u32(writer.count - central_offset as u64)?;
    write_end_record(&mut writer, entries.len() as u16, central_offset, central_size)?;

    writer.inner.flush().map_err(|_| "unknown".to_string())?;
    let sha256 = format!("{:x}", writer.hasher.finalize());
    let byte_size = writer.count;

    Ok(WrittenZip {
        sha256,
        byte_size,
        entries: written,
    })
}

#[cfg(test)]
mod tests {
    use super::{crc32, write_stored_zip, ZipInput};

    #[test]
    fn computes_the_standard_crc32() {
        assert_eq!(crc32(b""), 0);
        assert_eq!(crc32(b"123456789"), 0xcbf43926);
    }

    #[test]
    fn writes_a_stored_zip_whose_reported_offsets_hold_the_blob_bytes() {
        let root = std::env::temp_dir().join(format!("asakiri_zip_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let root_string = root.to_string_lossy().into_owned();
        std::fs::create_dir_all(root.join("media")).unwrap();
        std::fs::write(root.join("media/a.bin"), b"hello world").unwrap();
        std::fs::write(root.join("media/b.bin"), b"second blob!!").unwrap();

        let result = write_stored_zip(
            root_string,
            "release/unit.akp".to_string(),
            vec![
                ZipInput { name: "sha-a".to_string(), source_relative_path: "media/a.bin".to_string() },
                ZipInput { name: "sha-b".to_string(), source_relative_path: "media/b.bin".to_string() },
            ],
        )
        .unwrap();

        let file_bytes = std::fs::read(root.join("release/unit.akp")).unwrap();
        assert_eq!(&file_bytes[0..4], &[0x50, 0x4b, 0x03, 0x04]);
        assert_eq!(result.byte_size, file_bytes.len() as u64);

        let a = &result.entries[0];
        let a_bytes = &file_bytes[a.offset as usize..(a.offset + a.length) as usize];
        assert_eq!(a_bytes, b"hello world");
        let b = &result.entries[1];
        let b_bytes = &file_bytes[b.offset as usize..(b.offset + b.length) as usize];
        assert_eq!(b_bytes, b"second blob!!");

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn reports_a_missing_source_file() {
        let root = std::env::temp_dir().join(format!("asakiri_zip_missing_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);

        let result = write_stored_zip(
            root.to_string_lossy().into_owned(),
            "release/unit.akp".to_string(),
            vec![ZipInput {
                name: "sha-a".to_string(),
                source_relative_path: "media/gone.bin".to_string(),
            }],
        );

        assert_eq!(result.unwrap_err(), "notFound".to_string());
        let _ = std::fs::remove_dir_all(&root);
    }
}
