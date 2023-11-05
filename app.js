import fs from "fs";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";

const directoryPath = "/Volumes/media/Movies"; // Replace with the path to your directory
let extentions = [];

let mediaExtentions = [".mp4", ".mkv", ".avi", ".MP4", ".AVI"];
let subtitleExtentions = [".sub", ".srt"];
function directoryContainsSubdirectory(parentDir, subDirName) {
  try {
    const items = fs.readdirSync(parentDir);
    return items.some(
      (item) =>
        fs.statSync(`${parentDir}/${item}`).isDirectory() && item === subDirName
    );
  } catch (err) {
    return false;
  }
}

function eXec(command) {
  try {
    const result = execSync(command, { encoding: "utf-8" });
    console.log("Command output:");
    console.log(result);
  } catch (error) {
    console.error(chalk.red(`Error executing command: ${error}`));
  }
}

function getFileSizeSync(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInKilobytes = fileSizeInBytes / 1024;
    const fileSizeInMegabytes = fileSizeInKilobytes / 1024;

    return {
      bytes: fileSizeInBytes,
      kilobytes: fileSizeInKilobytes,
      megabytes: fileSizeInMegabytes,
    };
  } catch (err) {
    throw new Error(`Error getting file size: ${err.message}`);
  }
}

function isDir(_path) {
  try {
    const stats = fs.statSync(_path);
    return stats.isDirectory();
  } catch (err) {
    return false; // Handle errors, such as if the path doesn't exist
  }
}
function isFile(_path) {
  try {
    const stats = fs.statSync(_path);
    return stats.isFile();
  } catch (err) {
    return false; // Handle errors, such as if the path doesn't exist
  }
}
function findExtensions(files) {
  let res = {
    hasMedia: false,
    hasSubtitles: false,
    hasMultipleMediaFiles: 0,
  };
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let ext = path.extname(file);
    if (mediaExtentions.includes(ext)) {
      res.hasMedia = file;
      res.hasMultipleMediaFiles++;
    }
    if (subtitleExtentions.includes(ext)) res.hasSubtitles = file;
  }
  res.hasMultipleMediaFiles = res.hasMultipleMediaFiles > 1 ? true : false;
  return res;
}

function getFilesInDir(_path, fullPath = true) {
  let files = [];
  const items = fs.readdirSync(_path);
  items.forEach((file) => {
    let filePath = path.join(_path, file);
    //   console.log("|_", file);
    if (isFile(filePath)) {
      files.push(filePath);
    }
    extentions.push(path.extname(fullPath ? filePath : file));
  });
  return files;
}

function movieHasMobileVersion(_path) {
  if (directoryContainsSubdirectory(_path, "Plex Versions")) {
    let plexVerDir = path.join(_path, "Plex Versions");
    if (directoryContainsSubdirectory(plexVerDir, "Optimized for Mobile")) {
      let mobileVerDir = path.join(plexVerDir, "Optimized for Mobile");
      return mobileVerDir;
    }
  }
  return false;
}
function getIntersection(arr1, arr2) {
  return arr1.filter((value) => arr2.includes(value));
}

try {
  const movies = fs.readdirSync(directoryPath);
  movies.forEach((movie) => {
    const moviePath = path.join(directoryPath, movie);
    const backupMoviePath = moviePath.replace("/Movies", "/___MOvies");
    let checks = {
      OriginalVersionMediaExists: null,
      OriginalVersionSubsExists: null,
      OriginalMultiMediaFiles: null,
      MobileVersionMediaExists: null,
      MobileVersionSubsExists: null,
      MobileMultiMediaFiles: null,
      MobileVersionDifferentName: null,
      MobileVersionFileSizeOK: null,
    };
    if (!isDir(moviePath)) {
      console.log(chalk.grey(moviePath));
      return;
    }
    let mobileVerDir = movieHasMobileVersion(moviePath);
    if (!mobileVerDir) {
      console.log(chalk.grey(moviePath));
      return;
    }
    let originalFiles = getFilesInDir(moviePath, false);
    // console.log({ originalFiles });
    let mobileFiles = getFilesInDir(mobileVerDir, false);
    // console.log({ mobileFiles });

    let mobileVerDirScanRes = findExtensions(mobileFiles);
    checks.MobileVersionMediaExists = mobileVerDirScanRes.hasMedia;
    checks.MobileVersionSubsExists = mobileVerDirScanRes.hasSubtitles;
    checks.MobileMultiMediaFiles = mobileVerDirScanRes.hasMultipleMediaFiles;

    let originalVerDirScanRes = findExtensions(originalFiles);
    checks.OriginalVersionMediaExists = originalVerDirScanRes.hasMedia;
    checks.OriginalVersionSubsExists = originalVerDirScanRes.hasSubtitles;
    checks.OriginalMultiMediaFiles =
      originalVerDirScanRes.hasMultipleMediaFiles;
    checks.MobileVersionDifferentName =
      getIntersection(mobileFiles, originalFiles).length == 0;
    if (checks.MobileVersionMediaExists)
      checks.MobileVersionFileSizeOK =
        getFileSizeSync(checks.MobileVersionMediaExists).megabytes > 500
          ? true
          : false;
    let error = 0;
    let warning = 0;
    if (
      !checks.MobileVersionMediaExists ||
      checks.OriginalMultiMediaFiles ||
      checks.MobileMultiMediaFiles ||
      !checks.MobileVersionFileSizeOK
    ) {
      error = 1;
    }
    if (!checks.MobileVersionDifferentName) {
      warning = 1;
    }

    console.log(
      error
        ? chalk.red(moviePath)
        : warning
        ? chalk.yellow(moviePath)
        : chalk.green(moviePath),
      `\norg media ${
        checks.OriginalVersionMediaExists ? "✅" : "❌"
      }\norg no multi media ${
        !checks.OriginalMultiMediaFiles ? "✅" : "❌"
      }\norg media ${
        checks.OriginalVersionMediaExists ? "✅" : "❌"
      }\norg translation ${
        checks.OriginalVersionSubsExists ? "✅" : "❌"
      }\nmobile media ${
        checks.MobileVersionMediaExists ? "✅" : "❌"
      }\nmobile no multi media ${
        !checks.MobileMultiMediaFiles ? "✅" : "❌"
      }\nmobile translation ${
        checks.MobileVersionSubsExists ? "✅" : "❌"
      }\nfile name confilict ${
        checks.MobileVersionDifferentName ? "✅" : "❌"
      }\nfile size OK ${checks.MobileVersionFileSizeOK ? "✅" : "❌"}`
    );
    if (checks.MobileVersionSubsExists) {
      console.log(chalk.blue(`mv "${mobileVerDir}/"*.srt "${moviePath}/"`));
      eXec(`mv "${mobileVerDir}/"*.srt "${moviePath}/"`);
    }
    if (error) {
      return;
    }

    if (checks.OriginalVersionMediaExists) {
      console.log(chalk.blue(`mkdir "${backupMoviePath}"`));
      eXec(`mkdir "${backupMoviePath}"`);
      console.log(
        chalk.blue(
          `mv "${
            checks.OriginalVersionMediaExists
          }" "${checks.OriginalVersionMediaExists.replace(
            "/Movies/",
            "/___MOvies/"
          )}"`
        )
      );
      eXec(
        `mv "${
          checks.OriginalVersionMediaExists
        }" "${checks.OriginalVersionMediaExists.replace(
          "/Movies/",
          "/___MOvies/"
        )}"`
      );
      let orgExt = path.extname(checks.OriginalVersionMediaExists);
      let mobileExt = path.extname(checks.MobileVersionMediaExists);

      console.log(
        chalk.bgYellow(
          `mv "${
            checks.MobileVersionMediaExists
          }" "${checks.OriginalVersionMediaExists.replaceAll(
            orgExt,
            mobileExt
          )}"`
        )
      );
      eXec(
        `mv "${
          checks.MobileVersionMediaExists
        }" "${checks.OriginalVersionMediaExists.replaceAll(orgExt, mobileExt)}"`
      );
    } else {
      chalk.blue(`mv "${checks.MobileVersionMediaExists}" "${moviePath}/"`);
      eXec(`mv "${checks.MobileVersionMediaExists}" "${moviePath}/"`);
    }
  });
  extentions = [...new Set(extentions)];
  console.log({ extentions });
} catch (err) {
  console.error("Error reading directory:", err);
}
