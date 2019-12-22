const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const { execSync } = require('child_process');
const copyFile = require('fs-copy-file'); // node v6.10.3 support

const AbstractService = require('../AbstractService');

class Dependencies extends AbstractService {
  init() {
    this.commands = {
      npm: 'npm install --production',
      yarn: 'yarn --production'
    };
    this.nodeJsDir = path.join(process.cwd(), this.plugin.settings.compileDir, 'layers', 'nodejs');
  }

  run(cmd) {
    console.log(execSync(cmd, {
      cwd: this.nodeJsDir,
      env: process.env
    }).toString());
  }

  copyProjectFile(filename, destination) {
    this.init();
    let filePath;
    if (path.isAbsolute(filename)) {
      filePath = filename;
    } else {
      filePath = process.resolve(path.cwd(), filename);
    }

    if (!fs.existsSync(filePath)) {
      this.plugin.log(`[warning] "${filename}" file does not exists!`);
      return true;
    }

    return new Promise((resolve) => {
      copyFile(filePath, path.join(this.nodeJsDir, destination), (copyErr) => {
        if (copyErr) throw copyErr;
        return resolve();
      });
    });
  }

  async install() {
    this.init();
    this.plugin.log('Dependencies has changed! Re-installing...');

    await mkdirp.sync(this.nodeJsDir);
    await this.copyProjectFile(this.plugin.settings.packagePath, 'package.json');

    if (this.plugin.settings.packageManager === 'npm') {
      await this.copyProjectFile(this.plugin.settings.packageLockPath || 'package-lock.json', 'package-lock.json');
    }

    if (this.plugin.settings.packageManager === 'yarn') {
      await this.copyProjectFile(this.plugin.settings.yarnLockPath || 'yarn.lock', 'yarn.lock');
    }

    // custom commands
    if (this.plugin.settings.customInstallationCommand) {
      return this.run(this.plugin.settings.customInstallationCommand);
    }

    // packages installation
    return this.run(this.commands[this.plugin.settings.packageManager]);
  }
}

module.exports = Dependencies;
