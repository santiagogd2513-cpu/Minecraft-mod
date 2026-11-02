//! Android-specific setup for the Arnis app.
//!
//! On a phone there is no home directory, no desktop and the working directory is `/`,
//! which is read-only. Arnis keeps its tile caches under the OS cache directory (or the
//! working directory as a fallback), so before anything else runs we point `HOME`, the
//! XDG directories, `TMPDIR` and the working directory at the app's private storage.
//!
//! Generated Java worlds go to `Download/Arnis` on the shared storage so they are easy
//! to find with any file manager, and are also packed into a `.zip` next to the folder.

use std::fs;
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};

use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

/// Shared storage root on Android ("Almacenamiento interno").
const SHARED_STORAGE: &str = "/storage/emulated/0";

/// The app's package name, read from the process name (`/proc/self/cmdline`).
fn package_name() -> Option<String> {
    let raw = fs::read("/proc/self/cmdline").ok()?;
    let first = raw.split(|b| *b == 0).next()?;
    let name = String::from_utf8_lossy(first).to_string();
    // Secondary processes are named "package:suffix".
    let name = name.split(':').next()?.trim().to_string();
    (!name.is_empty() && name.contains('.')).then_some(name)
}

/// Private data directory of the app (`/data/data/<package>`).
fn private_base_dir() -> PathBuf {
    match package_name() {
        Some(pkg) => PathBuf::from("/data/data").join(pkg),
        None => PathBuf::from("."),
    }
}

/// Points HOME, XDG dirs, TMPDIR and the working directory at the app's private storage.
/// Must run before any cache directory is resolved.
pub fn prepare_environment() {
    let base = private_base_dir();
    let files = base.join("files");
    let cache = base.join("cache");
    let tmp = cache.join("tmp");
    let config = files.join("config");
    for dir in [&files, &cache, &tmp, &config] {
        let _ = fs::create_dir_all(dir);
    }

    // `set_var` is only safe while no other thread reads the environment, which holds
    // here: this runs first thing on the thread Tauri starts the app on.
    unsafe {
        std::env::set_var("HOME", &files);
        std::env::set_var("XDG_CACHE_HOME", &cache);
        std::env::set_var("XDG_DATA_HOME", &files);
        std::env::set_var("XDG_CONFIG_HOME", &config);
        std::env::set_var("TMPDIR", &tmp);
    }
    let _ = std::env::set_current_dir(&cache);
}

/// Where Java worlds are saved by default: `Download/Arnis` on the shared storage,
/// falling back to the app's own external folder, then to its private storage.
pub fn default_saves_dir() -> PathBuf {
    let mut candidates = vec![PathBuf::from(SHARED_STORAGE).join("Download").join("Arnis")];
    if let Some(pkg) = package_name() {
        candidates.push(
            PathBuf::from(SHARED_STORAGE)
                .join("Android/data")
                .join(pkg)
                .join("files/Arnis"),
        );
    }
    candidates.push(private_base_dir().join("files").join("Arnis"));

    for dir in &candidates {
        let _ = fs::create_dir_all(dir);
        if crate::world_utils::is_writable_dir(dir) {
            return dir.clone();
        }
    }
    candidates.last().cloned().unwrap_or_else(|| PathBuf::from("."))
}

/// Packs a generated world folder into `<folder>.zip` next to it, with the world folder
/// as the single top-level entry (the layout Minecraft expects when importing a world).
pub fn zip_world(world_dir: &Path) -> io::Result<PathBuf> {
    let name = world_dir
        .file_name()
        .ok_or_else(|| io::Error::other("world folder has no name"))?
        .to_string_lossy()
        .to_string();
    let zip_path = world_dir.with_file_name(format!("{name}.zip"));
    let tmp_path = world_dir.with_file_name(format!("{name}.zip.part"));

    let file = fs::File::create(&tmp_path)?;
    let mut writer = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .large_file(true);

    let mut stack = vec![world_dir.to_path_buf()];
    let mut buf = Vec::new();
    while let Some(dir) = stack.pop() {
        let rel = dir.strip_prefix(world_dir).unwrap_or(Path::new(""));
        let prefix = if rel.as_os_str().is_empty() {
            format!("{name}/")
        } else {
            format!("{name}/{}/", rel.to_string_lossy().replace('\\', "/"))
        };
        writer.add_directory(prefix.clone(), options).map_err(io::Error::other)?;

        let mut entries: Vec<_> = fs::read_dir(&dir)?.filter_map(|e| e.ok()).collect();
        entries.sort_by_key(|e| e.file_name());
        for entry in entries {
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();
            // Skip the session lock Minecraft/Arnis keep open while a world is in use.
            if file_name == "session.lock" {
                continue;
            }
            if path.is_dir() {
                stack.push(path);
            } else {
                writer
                    .start_file(format!("{prefix}{file_name}"), options)
                    .map_err(io::Error::other)?;
                buf.clear();
                fs::File::open(&path)?.read_to_end(&mut buf)?;
                writer.write_all(&buf)?;
            }
        }
    }
    writer.finish().map_err(io::Error::other)?;
    let _ = fs::remove_file(&zip_path);
    fs::rename(&tmp_path, &zip_path)?;
    Ok(zip_path)
}

/// Shortens `/storage/emulated/0/Download/Arnis/X` to `Download/Arnis/X` for messages.
pub fn friendly_path(path: &Path) -> String {
    let s = path.display().to_string();
    s.strip_prefix(&format!("{SHARED_STORAGE}/"))
        .map(str::to_string)
        .unwrap_or(s)
}
