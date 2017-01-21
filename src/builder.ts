import { Git } from './git';
import { readJSON } from 'fs-promise';
import { spawn, SpawnOptions, exec } from 'child_process';
import { ReplaySubject } from 'rxjs';
var fs = require('fs');
var cmd = require('node-cmd');

export class Builder {

    static RunningBuilds: Object = {};
    static IsBuildRunning(repo: string, branch: string, target: string): Builder {
        let buildKey = repo + branch + target;

        if(Builder.RunningBuilds[buildKey]) {
            return Builder.RunningBuilds[buildKey];
        } else {
            return null;
        }
    }

    static RunBuild(repo: string, branch: string, target: string) {

        if(Builder.IsBuildRunning(repo, branch, target)) {
            return Builder.IsBuildRunning(repo, branch, target);
        }

        let buildKey = repo + branch + target;
        let builder = new Builder();
        builder.build(repo, branch, target)
            .then(x => {
                builder.log.next('END');
                Builder.RunningBuilds[buildKey] = null;
                
            })
            .catch(x => {
                builder.log.next(x);
                builder.log.next('END');
                Builder.RunningBuilds[buildKey] = null;
            });
        Builder.RunningBuilds[buildKey] = builder;
        return builder;
    }

    private git: Git;
    public log: ReplaySubject<string>;
    private logFile: any;

    constructor() {
        this.git = new Git();
        this.log = new ReplaySubject<string>();
    }
    async build(repo: string, branch: string, target: string) {
        this.emitLog(`RUNNING BUILD`);
        this.emitLog(`REPO = ${repo}`);
        this.emitLog(`BRANCH = ${branch}`);
        this.emitLog(`TARGET = ${target}`);
        this.emitLog(`==================================================`);
        this.emitLog('Cloning ' + repo);
        await this.git.clone(repo);
        await this.git.checkoutBranch(branch);

        this.logFile = fs.createWriteStream(this.git.build_path + '/builder.log', {'flags': 'a'});        

        let bashCommand = `
        export BUILD_DIR="${this.git.build_path}"
        export BUILD_REPO="${repo}"
        export BUILD_BRANCH="${branch}"
        export BUILD_TARGET="${target}"
        
        cd $BUILD_DIR
        chmod +x ./build.sh
        ls 
        ./build.sh
        `;

        await this.runBashCommand(bashCommand);
        await this.cleanup();
        this.logFile.end('DONE');
    }



    private runBashCommand(bashCmd: string): Promise<any> {
      return new Promise((resolve, reject) => {
          
          let child = exec(bashCmd,{maxBuffer: 1024 * 1024 * 10}, (error, stdout, stderr) => {
              console.log(error);
              //this.log.next(error);
              this.log.next("Finished");
              resolve();
          });
          child.stdout.on('data', (data) => {
              console.log(data.toString());
              this.log.next(data.toString());
          });

          child.stderr.on('data', (data) => {
              console.log(data.toString()); 
              this.log.next(data.toString());
          });
          
          //cmd.get( bashCmd, x => resolve(x))
      })
    }

    private cleanup(): Promise<any> {
      return new Promise((resolve, reject) => {
          
          let child = exec(`rm -rf ${this.git.build_path}`, (error, stdout, stderr) => {
              resolve();
          });
          child.stdout.on('data', (data) => {
              console.log(data.toString());
              this.log.next(data.toString());
          });

          child.stderr.on('data', (data) => {
              console.log(data.toString()); 
              this.log.next(data.toString());
          });
          
          //cmd.get( bashCmd, x => resolve(x))
      })
    }

    private async readBuildConfig(): Promise<BuildFile> {
        return (await readJSON(this.buildConfigFile)) as BuildFile;
    }

    private async readNpmPackage(): Promise<Object> {
        return (await readJSON(this.npmPackageFile)) as Object;
    }

    private get buildConfigFile(): string {
        return this.git.build_path + '/builder.json';
    }

    private get npmPackageFile(): string {
        return this.git.build_path + '/package.json';
    }

    private emitLog(text: string): void {
        console.log(text);
        if(this.logFile) {
            this.logFile.write(text + '\n\n');
        }
        this.log.next(text + '\n\n');
    }

}

export interface BuildFile {
    tasks: Object;
    builds: Object[];
}